import { createHash, randomBytes } from "node:crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CollectionShareView,
  Contribution,
  CursorMeta,
  DiscoverOverview,
  HubCard,
  HubContributor,
  HubPage,
  HubPerson,
  OperationReason,
  PersonRef,
  PopularTag,
  SavedCollection,
  ShareDescriptor,
  SharedCollection,
  Collection as WireCollection,
} from "@ntumie/types";
import { type ActivityEntry, auditActions, contentActions } from "@ntumie/types";
import { isUUID } from "class-validator";
import { CursorQueryDto } from "src/common/dto/cursor-query.dto";
import { ResourceKind } from "src/common/enums/resource-kind.enum";
import { AuthUser } from "src/common/interfaces/auth-user.interface";
import { decodeCursor, encodeCursor } from "src/common/utils/cursor.util";
import { toVersionEtag } from "src/common/utils/etag.util";
import { PrismaService } from "src/database/prisma.service";
import { Collection, Hub, Prisma } from "src/generated/prisma/client";
import { type AuditInput, recordAudit } from "../../common/audit";
import { appError } from "../../common/errors/app-exception";
import { personRefs } from "../../common/people";
import { wireToken } from "../../common/utils/wire-token";
import { emailConfig } from "../../email/config";
import { availableCollections } from "../hubs/availability";
import { CollectionPolicyService } from "../hubs/collection-policy.service";
import { ensurePersonalHub } from "../hubs/hub-onboarding";
import { HubsService } from "../hubs/hubs.service";
import { applyCollectionImpact, collectionImpact } from "./collection-impact";
import { CollectionImpactDto } from "./dto/collection-impact.dto";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { CreateShareDto } from "./dto/create-share.dto";
import { SetLinkSharingDto } from "./dto/set-link-sharing.dto";
import { TransferCollectionDto } from "./dto/transfer-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hubs: HubsService,
    private readonly policy: CollectionPolicyService,
  ) {}

  // --- creation -----------------------------------------------------------

  async createHub(user: AuthUser): Promise<{ hubId: string }> {
    const hub = await ensurePersonalHub(this.prisma, user.userId);
    return { hubId: hub.id };
  }

  async create(user: AuthUser, dto: CreateCollectionDto) {
    const hubId = (await ensurePersonalHub(this.prisma, user.userId)).id;
    return this.createInHub(user, hubId, dto);
  }

  // --- settings / lifecycle ----------------------------------------------

  async update(id: string, user: AuthUser, dto: UpdateCollectionDto) {
    const collection = await this.requireCollection(id);
    await this.policy.requireManage(collection, user);

    if (dto.published === true) await this.policy.requireUnrestricted(collection);
    if (Number(dto.version) !== Number(collection.version)) {
      throw appError("version_conflict");
    }

    // Details that shape the collection's content make its owner a contributor
    // (ADR-0015); publishing is recorded on its own.
    const detailsChanged =
      (dto.title !== undefined && dto.title !== collection.title) ||
      (dto.description !== undefined && dto.description !== collection.description) ||
      (dto.commentsEnabled !== undefined && dto.commentsEnabled !== collection.commentsEnabled);
    const events: AuditEvent[] = [
      ...(detailsChanged ? [{ action: "collection.updated" as const }] : []),
      ...(dto.published === undefined || dto.published === collection.published
        ? []
        : [
            {
              action: dto.published ? "collection.published" : "collection.unpublished",
              effect: {
                beforeState: collection.published ? "published" : "unpublished",
                afterState: dto.published ? "published" : "unpublished",
                outcome: "success",
              },
            } as const,
          ]),
    ];
    const saved = await this.mutateOwned(collection, user, events, async (tx) => {
      const current = await tx.collection.findUniqueOrThrow({
        where: { id: collection.id, hubId: collection.hubId },
      });
      if (current.version !== collection.version) throw appError("version_conflict");
      return tx.collection.update({
        include: collectionTags,
        where: { id: collection.id, hubId: collection.hubId, version: collection.version },
        data: {
          title: dto.title ?? collection.title,
          description: dto.description ?? collection.description,
          published: dto.published ?? collection.published,
          commentsEnabled: dto.commentsEnabled ?? collection.commentsEnabled,
          version: { increment: 1 },
        },
      });
    });
    return this.toPublicCollection(saved);
  }

  async impact(id: string, user: AuthUser, action: "delete" | "transfer") {
    return this.prisma.withAuthority(async () => {
      const collection = await this.requireCollection(id);
      await this.policy.requireManage(collection, user);
      return (await collectionImpact(this.prisma, collection, action)).view;
    });
  }

  async remove(id: string, user: AuthUser, dto: CollectionImpactDto = {}) {
    const collection = await this.requireCollection(id);
    await this.policy.requireManage(collection, user);
    await this.mutateOwned(collection, user, { action: "collection.deleted" }, async (tx) => {
      const current = await tx.collection.findUniqueOrThrow({
        where: { id, hubId: collection.hubId },
      });
      await applyCollectionImpact(tx, current, user.userId, "delete", dto.impactToken);
      await tx.collection.delete({ where: { id: collection.id, hubId: collection.hubId } });
    });
    return { id, deleted: true };
  }

  async setPublished(id: string, user: AuthUser, published: boolean) {
    const collection = await this.requireCollection(id);
    await this.policy.requireManage(collection, user);
    if (published) await this.policy.requireUnrestricted(collection);
    const event: AuditEvent = {
      action: published ? "collection.published" : "collection.unpublished",
    };
    const saved = await this.mutateOwned(collection, user, event, async (tx) => {
      const current = await tx.collection.findUniqueOrThrow({ where: { id } });
      event.effect = {
        beforeState: current.published ? "published" : "unpublished",
        afterState: published ? "published" : "unpublished",
        outcome: current.published === published ? "no_change" : "success",
      };
      return tx.collection.update({
        include: collectionTags,
        where: { id: collection.id },
        data: { published, version: { increment: 1 } },
      });
    });
    return this.toPublicCollection(saved);
  }

  async setLinkSharing(id: string, user: AuthUser, dto: SetLinkSharingDto) {
    const collection = await this.requireCollection(id);
    await this.policy.requireManage(collection, user);

    if (!dto.enabled) {
      // Disabling clears the token so an old link can never be resurrected.
      const event: AuditEvent = { action: "link.disabled" };
      await this.mutateOwned(collection, user, event, async (tx) => {
        const current = await tx.collection.findUniqueOrThrow({ where: { id } });
        event.effect = {
          beforeState: current.linkSharingEnabled ? "enabled" : "disabled",
          afterState: "disabled",
          outcome: current.linkSharingEnabled || current.shareTokenHash ? "success" : "no_change",
        };
        return tx.collection.update({
          include: collectionTags,
          where: { id: collection.id },
          data: {
            linkSharingEnabled: false,
            shareTokenHash: null,
            version: { increment: 1 },
          },
        });
      });
      return { collectionId: collection.id, linkSharingEnabled: false };
    }

    await this.policy.requireUnrestricted(collection);
    let token: string | undefined;
    const event: AuditEvent = { action: dto.rotate ? "link.rotated" : "link.enabled" };
    await this.mutateOwned(collection, user, event, async (tx) => {
      const current = await tx.collection.findUniqueOrThrow({
        where: { id: collection.id, hubId: collection.hubId },
      });
      // Decide from locked state: ordinary enable must never restore a
      // token invalidated by a concurrent rotation or disable.
      let shareTokenHash = current.shareTokenHash;
      if (!shareTokenHash || dto.rotate === true) {
        token = randomBytes(24).toString("base64url");
        shareTokenHash = createHash("sha256").update(token).digest("hex");
      }
      event.effect = {
        beforeState: current.linkSharingEnabled ? "enabled" : "disabled",
        afterState: "enabled",
        outcome: !current.linkSharingEnabled || token ? "success" : "no_change",
      };
      return tx.collection.update({
        include: collectionTags,
        where: { id: collection.id },
        data: {
          linkSharingEnabled: true,
          shareTokenHash,
          version: { increment: 1 },
        },
      });
    });

    return {
      collectionId: collection.id,
      linkSharingEnabled: true,
      // Raw token is shown once, only when freshly minted.
      ...(token ? { token, queryParam: `?s=${token}` } : {}),
    };
  }

  // --- direct sharing -----------------------------------------------------

  async createShare(id: string, user: AuthUser, dto: CreateShareDto) {
    const collection = await this.requireCollection(id);
    await this.policy.requireManage(collection, user);

    await this.policy.requireUnrestricted(collection);
    const target = await this.prisma.user.findFirst({
      where: { email: dto.email.trim().toLowerCase(), accountState: "active" },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException("No account found for that email");
    }

    const role = dto.role ?? "viewer";
    const event: AuditEvent = { action: "share.granted", targetUserId: target.id, role };
    await this.mutateOwned(collection, user, event, async (tx) => {
      const previous = await tx.collectionShare.findUnique({
        where: { collectionId_userId: { collectionId: id, userId: target.id } },
      });
      event.effect = {
        beforeState: previous ? `${previous.source}_${previous.role}` : "none",
        afterState: `direct_${role}`,
        outcome: previous?.source === "direct" && previous.role === role ? "no_change" : "success",
      };
      return tx.collectionShare.upsert({
        where: {
          collectionId_userId: { collectionId: collection.id, userId: target.id },
        },
        update: { role, source: "direct" },
        create: {
          collectionId: collection.id,
          userId: target.id,
          role,
          source: "direct",
        },
      });
    });

    return { collectionId: collection.id, userId: target.id, role };
  }

  async removeShare(id: string, user: AuthUser, targetUserId: string) {
    const collection = await this.requireCollection(id);
    await this.policy.requireManage(collection, user);
    const event: AuditEvent = { action: "share.revoked", targetUserId };
    await this.mutateOwned(collection, user, event, async (tx) => {
      const previous = await tx.collectionShare.findUnique({
        where: { collectionId_userId: { collectionId: id, userId: targetUserId } },
      });
      event.effect = {
        beforeState: previous ? `${previous.source}_${previous.role}` : "none",
        afterState: "none",
        outcome: previous ? "success" : "no_change",
      };
      return tx.collectionShare.deleteMany({
        where: { collectionId: collection.id, userId: targetUserId },
      });
    });
    return { collectionId: collection.id, userId: targetUserId, removed: true };
  }

  async listShares(id: string, user: AuthUser): Promise<CollectionShareView[]> {
    const collection = await this.requireCollection(id);
    await this.policy.requireManage(collection, user);
    const shares = await this.prisma.collectionShare.findMany({
      where: { collectionId: collection.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return shares.map((share) => ({
      userId: share.userId,
      displayName: share.user.name,
      // Display names are not unique, so direct shares echo back the email the
      // owner shared with. Link-source viewers never gave the owner their
      // email, so it is not exposed for them.
      email: share.source === "direct" ? share.user.email : null,
      role: wireToken(share.role, ["viewer", "contributor"]),
      source: wireToken(share.source, ["direct", "link"]),
    }));
  }

  // --- ownership transfer -------------------------------------------------

  // Google-Drive ownership transfer: only the current owner can transfer, and
  // only to a user who is already a contributor. The collection moves into
  // the recipient's hub (their "MyDrive"); the previous owner keeps contributor
  // access (lands in their shared/); the immutable creator is untouched.
  async transfer(id: string, user: AuthUser, dto: TransferCollectionDto) {
    const collection = await this.requireCollection(id);
    await this.policy.requireManage(collection, user); // owner-only

    await this.policy.requireUnrestricted(collection);
    const recipient = await this.prisma.user.findFirst({
      where: { email: dto.email.trim().toLowerCase(), accountState: "active" },
      select: { id: true },
    });
    if (!recipient) {
      throw new NotFoundException("No account found for that email");
    }
    if (recipient.id === user.userId) {
      throw appError("invalid_transfer");
    }

    // Drive rule: the recipient must already be a contributor on the collection.
    const share = await this.prisma.collectionShare.findUnique({
      where: { collectionId_userId: { collectionId: collection.id, userId: recipient.id } },
      select: { role: true },
    });
    if (share?.role !== "contributor") {
      throw appError("transfer_requires_contributor");
    }

    const recipientHub = await ensurePersonalHub(this.prisma, recipient.id);

    const previousOwnerId = user.userId;
    await this.mutateOwned(
      collection,
      user,
      {
        action: "collection.transferred_out",
        targetUserId: recipient.id,
        effect: { beforeState: collection.hubId, afterState: recipientHub.id, outcome: "success" },
      },
      async (tx) => {
        // Share management takes the same collection lock. Recheck after
        // acquiring it so a concurrent revocation cannot authorize transfer.
        const currentShare = await tx.collectionShare.findUnique({
          where: { collectionId_userId: { collectionId: collection.id, userId: recipient.id } },
          select: { role: true },
        });
        if (currentShare?.role !== "contributor") throw appError("transfer_requires_contributor");
        const current = await tx.collection.findUniqueOrThrow({
          where: { id, hubId: collection.hubId },
        });
        await applyCollectionImpact(tx, current, user.userId, "transfer", dto.impactToken);
        await recordAudit(tx, {
          hubId: recipientHub.id,
          actorUserId: user.userId,
          collectionId: collection.id,
          targetUserId: recipient.id,
          action: "collection.transferred_in",
          effect: {
            beforeState: collection.hubId,
            afterState: recipientHub.id,
            outcome: "success",
          },
        });
        await tx.collection.update({
          where: { id: collection.id, hubId: collection.hubId },
          data: { hubId: recipientHub.id, version: { increment: 1 } },
        });
        // The recipient now owns the collection, so their shares on it are redundant.
        await tx.collectionShare.deleteMany({
          where: { collectionId: collection.id, userId: recipient.id },
        });
        // Give the previous owner contributor access on this collection (their shared/).
        await tx.collectionShare.upsert({
          where: { collectionId_userId: { collectionId: collection.id, userId: previousOwnerId } },
          update: { role: "contributor", source: "direct" },
          create: {
            collectionId: collection.id,
            userId: previousOwnerId,
            role: "contributor",
            source: "direct",
          },
        });
      },
    );

    return {
      collectionId: collection.id,
      transferredTo: recipient.id,
      previousOwner: previousOwnerId,
    };
  }

  // --- saves --------------------------------------------------------------

  async save(id: string, user: AuthUser) {
    const collection = await this.requireCollection(id);
    await this.policy.requireRead(collection, user);
    if (!collection.published || !(await this.policy.resolve(collection, null)).canRead) {
      throw appError("collection_not_published");
    }
    await this.prisma.collectionSave.upsert({
      where: {
        collectionId_userId: {
          collectionId: collection.id,
          userId: user.userId,
        },
      },
      update: {},
      create: { collectionId: collection.id, userId: user.userId },
    });
    return { collectionId: collection.id, saved: true };
  }

  async unsave(id: string, user: AuthUser) {
    await this.prisma.collectionSave.deleteMany({
      where: { collectionId: id, userId: user.userId },
    });
    return { collectionId: id, saved: false };
  }

  // --- user surfaces ------------------------------------------------------

  async listShared(user: AuthUser): Promise<SharedCollection[]> {
    const shares = await this.prisma.collectionShare.findMany({
      where: { userId: user.userId, collection: availableCollections(user.userId) },
      include: { collection: { include: { ...collectionTags, hub: hubListing } } },
      orderBy: { createdAt: "desc" },
    });
    // Link-sourced access is valid only while link sharing stays enabled.
    return shares
      .filter((s) => s.source === "direct" || s.collection.linkSharingEnabled)
      .map((s) => ({
        ...this.toPublicCollection(s.collection),
        hub: s.collection.hub,
        shareRole: wireToken(s.role, ["viewer", "contributor"]),
        shareSource: wireToken(s.source, ["direct", "link"]),
      }));
  }

  async listSaved(user: AuthUser): Promise<SavedCollection[]> {
    const saves = await this.prisma.collectionSave.findMany({
      where: { userId: user.userId },
      include: { collection: { include: { ...collectionTags, hub: hubListing } } },
      orderBy: { savedAt: "desc" },
    });
    // Dormant handling: an unpublished save stays listed but marked
    // unavailable, and revives when the collection is republished.
    return Promise.all(
      saves.map(async (s) => {
        const available =
          s.collection.published && (await this.policy.resolve(s.collection, null)).canRead;
        return {
          ...this.toPublicCollection(s.collection),
          ...(available ? { hub: s.collection.hub } : { description: null, tags: [] }),
          savedAt: s.savedAt.toISOString(),
          available,
        };
      }),
    );
  }

  // What a person saved, as their public profile shows it when they opt in:
  // only collections anyone can read now. Dormant saves never show publicly.
  async publicSaved(userId: string, limit: number) {
    const saves = await this.prisma.collectionSave.findMany({
      where: {
        userId,
        collection: { published: true, ...availableCollections() },
      },
      select: { collectionId: true },
      orderBy: { savedAt: "desc" },
    });
    return {
      items: await this.listingsInOrder(saves.slice(0, limit).map((s) => s.collectionId)),
      total: saves.length,
    };
  }

  // --- discovery / lookup -------------------------------------------------

  async discover(query: CursorQueryDto, tag?: string) {
    return this.listPublishedCollections(query, {
      ...(tag ? { tags: { some: { tag: { name: tag.trim().toLowerCase() } } } } : {}),
    });
  }

  // Everything: a taste of each list in one read.
  async discoverOverview(): Promise<DiscoverOverview> {
    const [popular, hubs, newest, tags] = await Promise.all([
      this.discoverPopular(3),
      this.discoverHubs(4, "popular"),
      this.listPublishedCollections({ limit: 4 } as CursorQueryDto, {}),
      this.popularTags(6),
    ]);
    return { popular, hubs, newest: newest.items, tags };
  }

  // Popular this month: published collections by saves in the last 30 days,
  // then the latest update. Only collections someone saved in that window.
  async discoverPopular(limit: number) {
    const ranked = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM collections c
      JOIN collection_saves cs ON cs.collection_id = c.id
        AND cs.saved_at > now() - interval '30 days'
      JOIN hubs h ON h.id = c.hub_id
      JOIN users u ON u.id = h.owner_user_id AND u.account_state = 'active'
      LEFT JOIN collection_holds hold ON hold.collection_id = c.id AND hold.active
      WHERE c.published AND hold.collection_id IS NULL
      GROUP BY c.id, c.updated_at
      ORDER BY COUNT(*) DESC, c.updated_at DESC, c.id DESC
      LIMIT ${limit}
    `;
    return this.listingsInOrder(ranked.map(({ id }) => id));
  }

  // Hubs worth following: public hubs (a published collection, an active
  // owner) by saves of their collections in the last 30 days, or newest first.
  async discoverHubs(limit: number, order: "popular" | "newest"): Promise<HubCard[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT h.id
      FROM hubs h
      JOIN users u ON u.id = h.owner_user_id AND u.account_state = 'active'
      WHERE h.published_collection_count > 0
      ORDER BY
        ${
          order === "newest"
            ? Prisma.sql`h.created_at DESC`
            : Prisma.sql`(SELECT COUNT(*) FROM collection_saves cs
                JOIN collections c ON c.id = cs.collection_id AND c.published
                WHERE c.hub_id = h.id AND cs.saved_at > now() - interval '30 days') DESC,
              h.published_collection_count DESC`
        },
        h.id DESC
      LIMIT ${limit}
    `;
    const hubs = await this.prisma.hub.findMany({
      where: { id: { in: rows.map(({ id }) => id) } },
      include: { owner: { select: { id: true, username: true, name: true } } },
    });
    const saves = await this.hubSaves(hubs.map((hub) => hub.id));
    const byId = new Map(hubs.map((hub) => [hub.id, hub]));
    return rows.flatMap(({ id }) => {
      const hub = byId.get(id);
      if (!hub) return [];
      return [
        {
          id: hub.id,
          handle: hub.handle,
          name: hub.name,
          description: hub.description,
          owner: hub.showOwner ? { userId: hub.owner.id, username: hub.owner.username } : null,
          ownerName: hub.showOwner ? hub.owner.name.trim() || null : null,
          publishedCollectionCount: hub.publishedCollectionCount,
          collectionSaves: saves.get(hub.id) ?? 0,
        },
      ];
    });
  }

  // Everyone who changed the hub's published collections, most recent first,
  // with what they did (the hub's Contributors tab). Same visibility as the
  // hub page: public only with a published collection, else its owner only.
  async hubContributors(hubId: string, viewer: AuthUser | null): Promise<HubContributor[]> {
    const hub = await this.prisma.hub.findFirst({
      where: { id: hubId, owner: { accountState: "active" } },
      select: { id: true, ownerUserId: true, publishedCollectionCount: true },
    });
    if (!hub || (!hub.publishedCollectionCount && viewer?.userId !== hub.ownerUserId))
      throw new NotFoundException("Hub not found");
    const collections = await this.prisma.collection.findMany({
      where: { hubId, published: true, ...availableCollections() },
      select: { id: true, title: true },
    });
    if (!collections.length) return [];
    const titles = new Map(collections.map((c) => [c.id, c.title]));
    const groups = await this.prisma.auditLog.groupBy({
      by: ["actorUserId", "collectionId", "action"],
      where: {
        collectionId: { in: [...titles.keys()] },
        category: "content",
        action: { in: [...contentActions] },
      },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    const people = await this.prisma.user.findMany({
      where: {
        id: { in: [...new Set(groups.flatMap((g) => (g.actorUserId ? [g.actorUserId] : [])))] },
        accountState: "active",
      },
      select: { id: true, username: true, name: true },
    });
    const summaries = people.map((person) => {
      const mine = groups.filter((g) => g.actorUserId === person.id);
      const total = (actions: string[]) => {
        const matching = mine.filter((g) => actions.includes(g.action));
        return {
          count: matching.reduce((sum, g) => sum + g._count._all, 0),
          collections: [...new Set(matching.map((g) => g.collectionId))],
        };
      };
      const created = total(["collection.created"]);
      const links = total(["item.link_added", "item.reference_added", "items.imported"]);
      const sections = total(["item.section_added"]);
      const edited = total([...contentActions]);
      const [kind, chosen] = created.count
        ? (["created", created] as const)
        : links.count
          ? (["links", links] as const)
          : sections.count
            ? (["sections", sections] as const)
            : (["edited", edited] as const);
      const at = Math.max(...mine.map((g) => g._max.createdAt?.getTime() ?? 0));
      return {
        person: { userId: person.id, username: person.username, name: person.name.trim() || null },
        owner: person.id === hub.ownerUserId,
        kind,
        count: kind === "created" ? chosen.collections.length : chosen.count,
        collections: chosen.collections.length,
        collectionTitle:
          chosen.collections.length === 1
            ? (titles.get(chosen.collections[0] ?? "") ?? null)
            : null,
        at: new Date(at).toISOString(),
      } satisfies HubContributor;
    });
    // The owner first, then the most recent.
    return summaries.sort(
      (a, b) => Number(b.owner) - Number(a.owner) || Date.parse(b.at) - Date.parse(a.at),
    );
  }

  // Tags most used across published collections active in the last 90 days
  // (PRODUCT §6.6); private content never contributes.
  async popularTags(limit: number): Promise<PopularTag[]> {
    const rows = await this.prisma.$queryRaw<Array<{ name: string; collections: number }>>`
      SELECT t.name, COUNT(*)::int AS collections
      FROM collection_tags ct
      JOIN tags t ON t.id = ct.tag_id
      JOIN collections c ON c.id = ct.collection_id AND c.published
      JOIN hubs h ON h.id = c.hub_id
      JOIN users u ON u.id = h.owner_user_id AND u.account_state = 'active'
      LEFT JOIN collection_holds hold ON hold.collection_id = c.id AND hold.active
      WHERE hold.collection_id IS NULL AND c.updated_at > now() - interval '90 days'
      GROUP BY t.name
      ORDER BY collections DESC, t.name ASC
      LIMIT ${limit}
    `;
    return rows;
  }

  // Saves across each hub's published collections.
  private async hubSaves(hubIds: string[]) {
    if (!hubIds.length) return new Map<string, number>();
    const rows = await this.prisma.$queryRaw<Array<{ hub_id: string; saves: number }>>`
      SELECT c.hub_id, COUNT(*)::int AS saves
      FROM collection_saves cs
      JOIN collections c ON c.id = cs.collection_id AND c.published
      WHERE c.hub_id IN (${Prisma.join(hubIds.map((id) => Prisma.sql`${id}::uuid`))})
      GROUP BY c.hub_id
    `;
    return new Map(rows.map((row) => [row.hub_id, row.saves]));
  }

  // Listing rows for these collection IDs, in this order.
  private async listingsInOrder(ids: string[]) {
    const order = new Map(ids.map((id, index) => [id, index]));
    const rows = await this.prisma.collection.findMany({
      where: { id: { in: ids } },
      include: collectionListingInclude,
    });
    return this.toListings(rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
  }

  // Guides worth following: published collections ranked by how complete a
  // guide they are, then by saves, then by the latest update. Completeness is
  // one point each for a description, two or more sections, three or more
  // links, no empty section, notes on at least half the links, and a fetched
  // title and description on at least half the links (a link to another
  // collection shows that collection's own). There is no minimum: the best
  // available are shown. A collection with no links is never recommended.
  async discoverGuides(limit: number) {
    const ranked = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH items AS (
        SELECT r.collection_id, r.kind, r.note,
               LEAD(r.kind) OVER (PARTITION BY r.collection_id ORDER BY r.position) AS next_kind,
               r.kind = ${ResourceKind.COLLECTION_LINK} OR (
                 m.state = 'ready'
                 AND btrim(coalesce(m.title, '')) <> ''
                 AND btrim(coalesce(m.description, '')) <> ''
               ) AS described
        FROM resources r
        JOIN collections c ON c.id = r.collection_id AND c.published
        LEFT JOIN link_metadata m ON m.url = r.url
      ), stats AS (
        SELECT collection_id,
               COUNT(*) FILTER (WHERE kind = ${ResourceKind.HEADING}) AS sections,
               COUNT(*) FILTER (WHERE kind <> ${ResourceKind.HEADING}) AS links,
               COUNT(*) FILTER (WHERE kind <> ${ResourceKind.HEADING} AND btrim(coalesce(note, '')) <> '') AS noted,
               COUNT(*) FILTER (WHERE kind <> ${ResourceKind.HEADING} AND described) AS described,
               COUNT(*) FILTER (
                 WHERE kind = ${ResourceKind.HEADING} AND (next_kind IS NULL OR next_kind = ${ResourceKind.HEADING})
               ) AS empty_sections
        FROM items
        GROUP BY collection_id
      )
      SELECT c.id
      FROM collections c
      JOIN stats s ON s.collection_id = c.id
      JOIN hubs h ON h.id = c.hub_id
      JOIN users u ON u.id = h.owner_user_id AND u.account_state = 'active'
      LEFT JOIN collection_holds hold ON hold.collection_id = c.id AND hold.active
      WHERE c.published AND hold.collection_id IS NULL AND s.links > 0
      ORDER BY
        (btrim(coalesce(c.description, '')) <> '')::int
          + (s.sections >= 2)::int
          + (s.links >= 3)::int
          + (s.sections > 0 AND s.empty_sections = 0)::int
          + (s.noted * 2 >= s.links)::int
          + (s.described * 2 >= s.links)::int DESC,
        (SELECT COUNT(*) FROM collection_saves cs WHERE cs.collection_id = c.id) DESC,
        c.updated_at DESC,
        c.id DESC
      LIMIT ${limit}
    `;
    return this.listingsInOrder(ranked.map(({ id }) => id));
  }

  async getHubPage(hubId: string, query: CursorQueryDto, viewer: AuthUser | null = null) {
    const hub = await this.prisma.hub.findUnique({ where: { id: hubId } });
    return this.buildHubPage(hub, query, viewer);
  }

  // Handle resolution for /@handle pages. The handle is the handy way in; the
  // payload carries the immutable hubId, which is what clients keep. Handle
  // semantics stay in the hubs module.
  async getHubPageByHandle(handle: string, query: CursorQueryDto, viewer: AuthUser | null = null) {
    const hub = await this.hubs.getHubByHandle(handle);
    return this.buildHubPage(hub, query, viewer);
  }

  private async buildHubPage(
    hub: Hub | null,
    query: CursorQueryDto,
    viewer: AuthUser | null,
  ): Promise<HubPage & { meta: CursorMeta }> {
    const visible =
      hub &&
      (await this.prisma.hub.findFirst({
        where: { id: hub.id, owner: { accountState: "active" } },
        select: {
          showOwner: true,
          owner: { select: { id: true, username: true, name: true } },
        },
      }));
    if (!hub || !visible) throw new NotFoundException("Hub not found");
    const [collections, publishedCollectionCount, saves, contributors] = await Promise.all([
      this.listPublishedCollections(query, { hubId: hub.id }),
      this.prisma.collection.count({
        where: { hubId: hub.id, published: true, ...availableCollections() },
      }),
      this.hubSaves([hub.id]),
      this.prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COUNT(DISTINCT a.actor_user_id)::int AS total
        FROM audit_logs a
        JOIN collections c ON c.id = a.collection_id AND c.published AND c.hub_id = ${hub.id}::uuid
        JOIN users u ON u.id = a.actor_user_id AND u.account_state = 'active'
        LEFT JOIN collection_holds hold ON hold.collection_id = c.id AND hold.active
        WHERE a.category = 'content' AND hold.collection_id IS NULL
          AND a.action IN (${Prisma.join([...contentActions])})
      `,
    ]);
    // ADR-0069: a hub is public only while it has a published collection; until
    // then only its owner can open it, and everyone else gets not found.
    if (!publishedCollectionCount && viewer?.userId !== visible.owner.id)
      throw new NotFoundException("Hub not found");
    return {
      hub: {
        id: hub.id,
        handle: hub.handle,
        name: hub.name,
        owner: visible.showOwner
          ? { userId: visible.owner.id, username: visible.owner.username }
          : null,
        ownerName: visible.showOwner ? visible.owner.name.trim() || null : null,
        description: hub.description,
        publishedCollectionCount,
        collectionSaves: saves.get(hub.id) ?? 0,
        contributorCount: contributors[0]?.total ?? 0,
        createdAt: hub.createdAt.toISOString(),
        updatedAt: hub.updatedAt.toISOString(),
      },
      collections: collections.items,
      meta: collections.meta,
    };
  }

  async listHubCollections(hubId: string, viewer: AuthUser | null, query: CursorQueryDto) {
    const hub = await this.prisma.hub.findUnique({
      where: { id: hubId },
      select: { id: true },
    });
    if (
      !hub ||
      !(await this.prisma.hub.findFirst({
        where: { id: hub.id, owner: { accountState: "active" } },
      }))
    ) {
      throw new NotFoundException("Hub not found");
    }

    const isOwner = viewer !== null && (await this.hubs.isOwner(hubId, viewer.userId));

    // The owner sees every collection; everyone else sees the published subset.
    const page = await this.listCollectionsKeyset(query, {
      hubId,
      ...(isOwner
        ? availableCollections(viewer?.userId)
        : { published: true, ...availableCollections() }),
    });
    if (!isOwner || !viewer) return page;
    // The owner's rows show who else shapes each collection.
    const others = await this.contributorsOf(
      page.items.map((item) => item.id),
      viewer.userId,
    );
    return {
      ...page,
      items: page.items.map((item) => ({
        ...item,
        contributors: others.get(item.id) ?? { people: [], total: 0 },
      })),
    };
  }

  // Everyone but `except` who has shaped each collection's content, most recent
  // first (up to five each), for a page of collections at once.
  private async contributorsOf(collectionIds: string[], except: string) {
    const groups = await this.prisma.auditLog.groupBy({
      by: ["collectionId", "actorUserId"],
      where: {
        collectionId: { in: collectionIds },
        actorUserId: { not: except },
        category: "content",
        action: { in: [...contentActions] },
      },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
    });
    const people = await personRefs(
      this.prisma,
      groups.map((group) => group.actorUserId),
    );
    const byCollection = new Map<string, PersonRef[]>();
    for (const group of groups) {
      const person = people.get(group.actorUserId ?? "");
      if (!person || !group.collectionId) continue;
      byCollection.set(group.collectionId, [
        ...(byCollection.get(group.collectionId) ?? []),
        person,
      ]);
    }
    return new Map(
      [...byCollection].map(([id, list]) => [id, { people: list.slice(0, 5), total: list.length }]),
    );
  }

  // What one person did in each collection, for their public profile: created
  // it, or else the links or sections they added, or else edits; with when.
  private async contributionsOf(collectionIds: string[], userId: string) {
    const groups = await this.prisma.auditLog.groupBy({
      by: ["collectionId", "action"],
      where: {
        collectionId: { in: collectionIds },
        actorUserId: userId,
        category: "content",
        action: { in: [...contentActions] },
      },
      _count: { _all: true },
      _max: { createdAt: true },
    });
    const summary = new Map<string, Contribution>();
    for (const id of collectionIds) {
      const mine = groups.filter((group) => group.collectionId === id);
      if (!mine.length) continue;
      const count = (...actions: string[]) =>
        mine
          .filter((group) => actions.includes(group.action))
          .reduce((total, group) => total + group._count._all, 0);
      const at = mine
        .map((group) => group._max.createdAt?.getTime() ?? 0)
        .reduce((latest, time) => Math.max(latest, time), 0);
      const links = count("item.link_added", "item.reference_added", "items.imported");
      const sections = count("item.section_added");
      summary.set(id, {
        kind: count("collection.created")
          ? "created"
          : links
            ? "links"
            : sections
              ? "sections"
              : "edited",
        count: links || sections,
        at: new Date(at).toISOString(),
      });
    }
    return summary;
  }

  async getById(id: string, viewer: AuthUser | null, shareToken?: string) {
    const collection = await this.requireCollection(id);
    return this.readCollectionView(collection, viewer, shareToken);
  }

  // Resolving a share address must not remember a link grant or assemble content.
  async getShareContext(id: string, viewer: AuthUser | null, shareToken?: string) {
    const collection = await this.requireCollection(id);
    const access = await this.policy.requireRead(collection, viewer, shareToken);
    // Owner/direct access does not prove that a submitted token is still valid.
    const recipient = await this.policy.resolve(collection, null, shareToken);
    const token = !collection.published && recipient.viaLinkToken ? shareToken : undefined;
    const recipientAccess: ShareDescriptor["access"] = recipient.canRead
      ? collection.published
        ? "public"
        : "link"
      : "restricted";
    return {
      id: collection.id,
      title: collection.title,
      token,
      access: recipientAccess,
      canManageAccess: access.canManage,
    };
  }

  private async readCollectionView(
    collection: CollectionWithTags,
    viewer: AuthUser | null,
    shareToken?: string,
  ) {
    const access = await this.policy.requireRead(collection, viewer, shareToken);
    if (access.viaLinkToken && viewer) {
      await this.policy.recordLinkAccess(collection.id, viewer.userId);
    }

    const reason = access.isOwner ? await this.policy.holdReason(collection) : null;
    const creator = collection.creatorUserId
      ? await this.prisma.user.findFirst({
          where: { id: collection.creatorUserId, accountState: "active" },
          select: { id: true, username: true },
        })
      : null;
    const contributors = await this.contributors(collection.id);
    return {
      collection: {
        ...this.toPublicCollection(collection),
        contributors,
        creator: creator ? { userId: creator.id, username: creator.username } : null,
        capabilities: { canManage: access.isOwner, canEdit: access.canWriteContent },
        ...(reason
          ? {
              restriction: {
                reason: reason as OperationReason,
                supportUrl: emailConfig().supportUrl,
              },
            }
          : {}),
      },
      etag: toVersionEtag(Number(collection.version)),
      lastModified: collection.updatedAt.toUTCString(),
    };
  }

  async listPeople(user: AuthUser, query: CursorQueryDto) {
    const hubId = await this.hubs.getUserHubId(user.userId);
    const limit = query.limit ?? 20;
    if (!hubId) {
      if (query.cursor) throw appError("invalid_cursor");
      return { items: [], meta: { limit, nextCursor: null } };
    }
    const cursor = query.cursor ? decodeCursor<{ id: string; hubId: string }>(query.cursor) : null;
    if (query.cursor && (!cursor || !isUUID(cursor.id) || cursor.hubId !== hubId))
      throw appError("invalid_cursor");
    const shares: Prisma.CollectionShareWhereInput = {
      collection: { hubId },
      OR: [{ source: "direct" }, { source: "link", collection: { linkSharingEnabled: true } }],
    };
    const rows = await this.prisma.user.findMany({
      where: { shares: { some: shares }, ...(cursor ? { id: { lt: cursor.id } } : {}) },
      orderBy: { id: "desc" },
      take: limit + 1,
      select: { id: true, username: true, _count: { select: { shares: { where: shares } } } },
    });
    const items: HubPerson[] = rows.slice(0, limit).map((person) => ({
      userId: person.id,
      username: person.username,
      collectionCount: person._count.shares,
    }));
    return {
      items,
      meta: {
        limit,
        nextCursor: rows.length > limit ? encodeCursor({ id: items.at(-1)?.userId, hubId }) : null,
      },
    };
  }

  private async mutateOwned<T>(
    collection: Collection,
    user: AuthUser,
    event: AuditEvent | AuditEvent[] | undefined,
    mutate: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT c.id FROM collections c JOIN hubs h ON h.id = c.hub_id
        WHERE c.id = ${collection.id}::uuid AND c.hub_id = ${collection.hubId}::uuid
          AND h.owner_user_id = ${user.userId}::uuid FOR UPDATE OF c`;
      if (locked.length !== 1) throw new NotFoundException("Collection not found");
      const result = await mutate(tx);
      for (const each of event === undefined ? [] : [event].flat())
        await recordAudit(tx, {
          ...each,
          hubId: collection.hubId,
          actorUserId: user.userId,
          collectionId: collection.id,
        });
      return result;
    });
  }

  // The collection's history for its contributors (owner and contributors), newest
  // first: who did what to which item (ADR-0015). Items show as they are now;
  // a removed item keeps its entry with no item. Not found for those who
  // can't read the collection; forbidden for readers. Contributors see content and
  // moderation only: sharing, link and transfer entries name who has access,
  // which only the owner may see (listing shares is owner-only).
  async activity(id: string, user: AuthUser, query: CursorQueryDto) {
    const collection = await this.requireCollection(id);
    const access = await this.policy.resolve(collection, user);
    if (!access.canRead) throw new NotFoundException("Collection not found");
    if (!access.canWriteContent) throw new ForbiddenException("Forbidden");
    const limit = query.limit ?? 20;
    const cursor = query.cursor ? decodeCursor<{ id: string }>(query.cursor) : null;
    if (
      query.cursor &&
      (!cursor ||
        typeof cursor.id !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(cursor.id) ||
        !(await this.prisma.auditLog.findFirst({
          where: { id: cursor.id, collectionId: id, category: "content" },
        })))
    )
      throw appError("invalid_cursor");
    const rows = await this.prisma.auditLog.findMany({
      where: {
        collectionId: id,
        category: "content",
        action: access.isOwner
          ? { not: "audit.read" }
          : { in: [...contentActions, ...moderationActions] },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit);
    const [people, items] = await Promise.all([
      personRefs(
        this.prisma,
        page.flatMap((row) => [row.actorUserId, row.targetUserId]),
      ),
      this.prisma.resource.findMany({
        where: {
          collectionId: id,
          id: { in: page.flatMap((row) => (row.resourceId ? [row.resourceId] : [])) },
        },
      }),
    ]);
    const titles = new Map(
      (
        await this.prisma.linkMetadata.findMany({
          where: { url: { in: items.flatMap((item) => (item.url ? [item.url] : [])) } },
          select: { url: true, title: true },
        })
      ).map((row) => [row.url, row.title]),
    );
    const itemViews = new Map<string, NonNullable<ActivityEntry["item"]>>();
    for (const item of items) {
      let title: string | null = null;
      if (item.kind === "heading") title = item.titleOverride;
      else if (item.kind === "external_link") title = titles.get(item.url ?? "") ?? item.url;
      else if (item.linkedCollectionId) {
        const target = await this.prisma.collection.findUnique({
          where: { id: item.linkedCollectionId },
        });
        if (
          target &&
          target.hubId === collection.hubId &&
          (await this.policy.resolve(target, user)).canRead
        )
          title = target.title;
      }
      itemViews.set(item.id, {
        id: item.id,
        kind: wireToken(item.kind, ["external_link", "collection_link", "heading"]),
        title,
      });
    }
    return {
      items: page.map(
        (row): ActivityEntry => ({
          id: row.id,
          action: wireToken(row.action, auditActions),
          actor: people.get(row.actorUserId ?? "") ?? null,
          target: (row.targetUserId && people.get(row.targetUserId)) || null,
          item: (row.resourceId && itemViews.get(row.resourceId)) || null,
          createdAt: row.createdAt.toISOString(),
        }),
      ),
      meta: {
        limit,
        nextCursor: rows.length > limit ? encodeCursor({ id: page.at(-1)?.id }) : null,
      },
    };
  }

  // Everyone who has shaped the collection's content (creation, details, items),
  // most recent first, from its activity entries (ADR-0015). Suspended accounts
  // are left out, as everywhere people are shown.
  private async contributors(collectionId: string) {
    const groups = await this.prisma.auditLog.groupBy({
      by: ["actorUserId"],
      where: { collectionId, category: "content", action: { in: [...contentActions] } },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
    });
    const people = await personRefs(
      this.prisma,
      groups.map((group) => group.actorUserId),
    );
    const ordered = groups.flatMap((group) => people.get(group.actorUserId ?? "") ?? []);
    return { people: ordered.slice(0, 5), total: ordered.length };
  }

  async publicContributions(userId: string, query: CursorQueryDto) {
    const limit = query.limit ?? 20;
    const cursor = query.cursor
      ? decodeCursor<{ u: string; id: string; person: string }>(query.cursor)
      : null;
    if (
      query.cursor &&
      (!cursor ||
        cursor.person !== userId ||
        typeof cursor.id !== "string" ||
        !isUUID(cursor.id) ||
        typeof cursor.u !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(cursor.u) ||
        Number.isNaN(Date.parse(cursor.u)) ||
        new Date(cursor.u).toISOString() !== `${cursor.u.slice(0, 23)}Z`)
    )
      throw appError("invalid_cursor");
    // Keep the SQL timestamp intact: Date would truncate the cursor to milliseconds.
    const rows = await this.prisma.$queryRaw<Array<{ id: string; updatedAt: string }>>(Prisma.sql`
      SELECT c.id,
        to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedAt"
      FROM collections c
      JOIN hubs h ON h.id = c.hub_id JOIN users u ON u.id = h.owner_user_id
      WHERE c.published AND u.account_state = 'active'
        AND NOT EXISTS (SELECT 1 FROM collection_holds ch WHERE ch.collection_id = c.id AND ch.active)
        AND EXISTS (SELECT 1 FROM audit_logs a WHERE a.category = 'content' AND a.collection_id = c.id
          AND a.actor_user_id = ${userId}::uuid AND a.action IN (${Prisma.join([...contentActions])}))
        ${cursor ? Prisma.sql`AND (c.updated_at, c.id) < (${cursor.u}::timestamptz, ${cursor.id}::uuid)` : Prisma.empty}
      ORDER BY c.updated_at DESC, c.id DESC LIMIT ${limit + 1}
    `);
    const page = rows.slice(0, limit);
    const [{ total }] = await this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM collections c
      JOIN hubs h ON h.id = c.hub_id JOIN users u ON u.id = h.owner_user_id
      WHERE c.published AND u.account_state = 'active'
        AND NOT EXISTS (SELECT 1 FROM collection_holds ch WHERE ch.collection_id = c.id AND ch.active)
        AND EXISTS (SELECT 1 FROM audit_logs a WHERE a.category = 'content' AND a.collection_id = c.id
          AND a.actor_user_id = ${userId}::uuid AND a.action IN (${Prisma.join([...contentActions])}))
    `);
    const found = await this.prisma.collection.findMany({
      where: { id: { in: page.map((row) => row.id) }, published: true, ...availableCollections() },
      include: { ...collectionTags, hub: { select: { id: true, handle: true, name: true } } },
    });
    const byId = new Map(found.map((row) => [row.id, row]));
    const contributions = await this.contributionsOf(
      found.map((row) => row.id),
      userId,
    );
    const last = page.at(-1);
    return {
      items: page.flatMap((row) => {
        const item = byId.get(row.id);
        return item
          ? [
              {
                ...this.toPublicCollection(item),
                hub: item.hub,
                ...(contributions.has(item.id)
                  ? { contribution: contributions.get(item.id) as Contribution }
                  : {}),
              },
            ]
          : [];
      }),
      total,
      meta: {
        limit,
        nextCursor:
          rows.length > limit && last
            ? encodeCursor({
                person: userId,
                id: last.id,
                u: last.updatedAt,
              })
            : null,
      },
    };
  }

  // --- internals ----------------------------------------------------------

  // Collections are independent containers.
  private async createInHub(user: AuthUser, hubId: string, dto: CreateCollectionDto) {
    const saved = await this.prisma.$transaction(async (tx) => {
      const created = await tx.collection.create({
        include: collectionTags,
        data: {
          hubId,
          // Immutable creator/provenance: unchanged if ownership is later
          // transferred (the owning hubId changes, the creator does not).
          creatorUserId: user.userId,
          title: dto.title,
          description: dto.description,
          published: dto.published ?? true,
        },
      });
      const event = { hubId, actorUserId: user.userId, collectionId: created.id };
      await recordAudit(tx, { ...event, action: "collection.created" });
      if (created.published) await recordAudit(tx, { ...event, action: "collection.published" });
      return created;
    });
    return this.toPublicCollection(saved);
  }

  private async listPublishedCollections(
    query: CursorQueryDto,
    extraWhere: Prisma.CollectionWhereInput,
  ) {
    return this.listCollectionsKeyset(query, {
      published: true,
      ...availableCollections(),
      ...extraWhere,
    });
  }

  private async listCollectionsKeyset(query: CursorQueryDto, where: Prisma.CollectionWhereInput) {
    const limit = query.limit ?? 20;
    const cursor = query.cursor ? decodeCursor<{ u: string; id: string }>(query.cursor) : null;
    if (
      query.cursor &&
      (cursor === null ||
        typeof cursor.u !== "string" ||
        typeof cursor.id !== "string" ||
        !isUUID(cursor.id) ||
        Number.isNaN(Date.parse(cursor.u)))
    ) {
      throw appError("invalid_cursor");
    }

    const rows = await this.prisma.collection.findMany({
      where: {
        AND: [
          where,
          ...(cursor
            ? [
                {
                  OR: [
                    { updatedAt: { lt: new Date(cursor.u) } },
                    { updatedAt: new Date(cursor.u), id: { lt: cursor.id } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: collectionListingInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    const nextCursor =
      rows.length > limit && last ? encodeCursor({ u: last.updatedAt, id: last.id }) : null;
    return { items: await this.toListings(items), meta: { limit, nextCursor } };
  }

  private async toListings(items: CollectionListingRow[]) {
    // Sections are heading items; everything else in the collection is a resource.
    const sections = new Map(
      (
        await this.prisma.resource.groupBy({
          by: ["collectionId"],
          where: { collectionId: { in: items.map((item) => item.id) }, kind: ResourceKind.HEADING },
          _count: { _all: true },
        })
      ).map((row) => [row.collectionId, row._count._all]),
    );
    const saves = new Map(
      (
        await this.prisma.collectionSave.groupBy({
          by: ["collectionId"],
          where: { collectionId: { in: items.map((item) => item.id) } },
          _count: { _all: true },
        })
      ).map((row) => [row.collectionId, row._count._all]),
    );
    return items.map((item) => ({
      ...this.toPublicCollection(item),
      saveCount: saves.get(item.id) ?? 0,
      sectionCount: sections.get(item.id) ?? 0,
      resourceCount: item._count.resources - (sections.get(item.id) ?? 0),
      hub: {
        id: item.hub.id,
        handle: item.hub.handle,
        name: item.hub.name,
      },
    }));
  }

  private async requireCollection(
    id: string,
    message = "Collection not found",
  ): Promise<CollectionWithTags> {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: collectionTags,
    });
    if (!collection) {
      throw new NotFoundException(message);
    }
    return collection;
  }

  private toPublicCollection(collection: CollectionWithTags): WireCollection {
    return {
      id: collection.id,
      hubId: collection.hubId,
      title: collection.title,
      description: collection.description,
      tags: collection.tags.map(({ tag }) => tag.name),
      published: collection.published,
      linkSharingEnabled: collection.linkSharingEnabled,
      commentsEnabled: collection.commentsEnabled,
      version: Number(collection.version),
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };
  }
}

type AuditEvent = Omit<AuditInput, "hubId" | "actorUserId" | "collectionId">;

const moderationActions = [
  "comment.hidden",
  "comment.shown",
  "comment.answer_marked",
  "comment.answer_unmarked",
] as const;

const collectionTags = {
  tags: {
    select: { tag: { select: { name: true } } },
    orderBy: [{ itemCount: "desc" as const }, { tag: { name: "asc" as const } }],
  },
};
type CollectionWithTags = Collection & { tags: { tag: { name: string } }[] };
const hubListing = { select: { id: true, handle: true, name: true } } as const;
const collectionListingInclude = {
  ...collectionTags,
  hub: hubListing,
  _count: { select: { resources: true } },
} satisfies Prisma.CollectionInclude;
type CollectionListingRow = Prisma.CollectionGetPayload<{
  include: typeof collectionListingInclude;
}>;
