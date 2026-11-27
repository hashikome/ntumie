import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { CaptureDestination, CaptureResult } from "@ntumie/types";
import { isUUID } from "class-validator";
import { ResourceKind } from "../../common/enums/resource-kind.enum";
import { appError } from "../../common/errors/app-exception";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { normalizeTags } from "../../common/utils/tags.util";
import { canonicalizeUrl, savableLinkUrl } from "../../common/utils/url.util";
import { PrismaService } from "../../database/prisma.service";
import { availableCollections } from "../hubs/availability";
import { CollectionPolicyService } from "../hubs/collection-policy.service";
import { ensurePersonalHub } from "../hubs/hub-onboarding";
import { ResourcesService } from "../resources/resources.service";
import { CollectionsService } from "./collections.service";
import { CaptureDto } from "./dto/capture.dto";

@Injectable()
export class CaptureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: CollectionPolicyService,
    private readonly collections: CollectionsService,
    private readonly resources: ResourcesService,
  ) {}

  // Runs inside the request's authority transaction (AuthorityInterceptor).
  async save(user: AuthUser, dto: CaptureDto): Promise<CaptureResult> {
    // Validate and canonicalise the link. Titles are never input: they are
    // resolved from the page after saving.
    const parsed = new URL(dto.link.url);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.href.length > 2048
    )
      throw appError("bad_request");
    const link = {
      url: canonicalizeUrl(parsed.href),
      tags: normalizeTags(dto.link.tags),
      ...(dto.link.note?.trim() ? { note: dto.link.note.trim() } : {}),
    };
    if (!["first", "new"].includes(dto.destination) && !isUUID(dto.destination))
      throw appError("bad_request");
    const name = dto.collectionTitle?.trim() || null;
    const description = dto.collectionDescription?.trim() || null;
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify([
          link,
          dto.destination,
          dto.sectionId ?? null,
          name,
          description,
          ...(!isUUID(dto.destination) && dto.published === false ? [false] : []),
        ]),
      )
      .digest("hex");
    const receipt = await this.prisma.captureReceipt.findUnique({
      where: { userId_operationId: { userId: user.userId, operationId: dto.operationId } },
    });
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) throw appError("conflict");
      const collection = await this.prisma.collection.findFirst({
        where: { id: receipt.collectionId },
      });
      if (!collection) throw appError("not_found");
      await this.policy.requireRead(collection, user);
      await this.policy.requireWriteContent(collection, user);
      const [resourceId] = receipt.resourceIds;
      const saved =
        resourceId &&
        (await this.prisma.resource.count({
          where: { collectionId: collection.id, id: resourceId },
        }));
      if (!saved) throw appError("not_found");
      return { collectionId: collection.id, resourceId };
    }
    // Completed operations replay their immutable saved IDs even if an old URL
    // shape has since been retired. Only new saves validate current address rules.
    savableLinkUrl(link.url);
    const hub = isUUID(dto.destination) ? null : await ensurePersonalHub(this.prisma, user.userId);
    let id = isUUID(dto.destination) ? dto.destination : null;
    if (dto.destination === "first" && hub) {
      if (hub.firstCaptureCollectionId) {
        const first = await this.prisma.collection.findFirst({
          where: {
            id: hub.firstCaptureCollectionId,
            hubId: hub.id,
            published: dto.published ?? true,
            linkSharingEnabled: false,
            shares: { none: {} },
          },
        });
        if (!first || first.createdAt.getTime() < dto.startedAt)
          throw appError("capture_destination_required");
        id = first.id;
      } else if (await this.prisma.collection.count({ where: { hubId: hub.id } }))
        throw appError("capture_destination_required");
    }
    if (!id) {
      if (!hub) throw appError("bad_request");
      // An explicit choice is remembered for the next new collection; without
      // one, the last remembered choice applies, else published.
      const remembered = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { newCollectionPublished: true },
      });
      const published = dto.published ?? remembered?.newCollectionPublished ?? true;
      const collection = await this.collections.create(user, {
        title: name ?? (await this.defaultTitle(hub.id)),
        ...(description ? { description } : {}),
        published,
      });
      if (dto.published !== undefined && dto.published !== remembered?.newCollectionPublished)
        await this.prisma.user.update({
          where: { id: user.userId },
          data: { newCollectionPublished: dto.published },
        });
      id = collection.id;
      if (dto.destination === "first" && hub)
        await this.prisma.hub.update({
          where: { id: hub.id },
          data: { firstCaptureCollectionId: id },
        });
    }
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw appError("not_found");
    await this.policy.requireRead(collection, user);
    await this.policy.requireWriteContent(collection, user);
    // A section must be one of this collection's own headings.
    const headings = await this.prisma.resource.findMany({
      where: { collectionId: id, kind: ResourceKind.HEADING },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    const sectionAt = headings.findIndex((heading) => heading.id === dto.sectionId);
    if (dto.sectionId && sectionAt < 0) throw appError("capture_section_missing");
    // A link already in the collection is kept as it is, not duplicated or moved.
    const linkedCollectionId = await this.resources.referenceTarget(collection, user, link.url);
    const existing = await this.prisma.resource.findFirst({
      where: {
        collectionId: id,
        OR: [{ url: link.url }, ...(linkedCollectionId ? [{ linkedCollectionId }] : [])],
      },
      select: { id: true },
    });
    let resourceId = existing?.id;
    if (!resourceId) {
      // It lands at the end of its section, in the place of the heading that
      // follows; without a section, among the links before the first one.
      const next = headings[sectionAt + 1];
      const position = next
        ? await this.resources.openSlot(id, next.position)
        : ((
            await this.prisma.resource.aggregate({
              where: { collectionId: id },
              _max: { position: true },
            })
          )._max.position ?? -1) + 1;
      const saved = await this.resources.insertLink(
        collection,
        user,
        link.url,
        linkedCollectionId,
        link.tags,
        position,
        link.note,
      );
      resourceId = saved.id;
    }
    await this.prisma.captureReceipt.create({
      data: {
        userId: user.userId,
        operationId: dto.operationId,
        collectionId: id,
        fingerprint,
        resourceIds: [resourceId],
      },
    });
    return { collectionId: id, resourceId };
  }

  /**
   * Where a link can be saved: the person's own collections, most recently
   * updated first, each with its sections; and `here` first of all, even when
   * it is someone else's collection they may add to.
   */
  async destinations(user: AuthUser, here?: string): Promise<CaptureDestination[]> {
    const hub = await this.prisma.hub.findUnique({
      where: { ownerUserId: user.userId },
      select: { id: true },
    });
    const own = hub
      ? await this.prisma.collection.findMany({
          where: { hubId: hub.id, ...availableCollections(user.userId) },
          select: { id: true, title: true },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        })
      : [];
    const choices = [...own];
    const at = choices.findIndex((row) => row.id === here);
    if (at > 0) choices.unshift(...choices.splice(at, 1));
    else if (at < 0 && here) {
      const shared = await this.prisma.collection.findUnique({ where: { id: here } });
      if (shared && (await this.policy.resolve(shared, user)).canWriteContent)
        choices.unshift({ id: shared.id, title: shared.title });
    }
    const headings = await this.prisma.resource.findMany({
      where: { collectionId: { in: choices.map((row) => row.id) }, kind: ResourceKind.HEADING },
      select: { id: true, collectionId: true, titleOverride: true },
      orderBy: { position: "asc" },
    });
    return choices.map((row) => ({
      id: row.id,
      title: row.title,
      here: row.id === here,
      sections: headings
        .filter((heading) => heading.collectionId === row.id)
        .map((heading) => ({ id: heading.id, title: heading.titleOverride ?? "" })),
    }));
  }

  /** The name a new collection would get now (the save form offers it). */
  async suggestedTitle(user: AuthUser) {
    const hub = await this.prisma.hub.findUnique({
      where: { ownerUserId: user.userId },
      select: { id: true },
    });
    return this.defaultTitle(hub?.id ?? null);
  }

  // "Saved links, Oct 7", then "Saved links, Oct 7 (2)" … so a default name
  // never repeats one already in the hub. Names people type may repeat.
  private async defaultTitle(hubId: string | null) {
    const base = `Saved links, ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date())}`;
    const taken = new Set(
      hubId
        ? (
            await this.prisma.collection.findMany({
              where: { hubId, title: { startsWith: base } },
              select: { title: true },
            })
          ).map((row) => row.title)
        : [],
    );
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base} (${n})`)) return `${base} (${n})`;
  }
}
