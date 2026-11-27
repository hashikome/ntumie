import { Controller, Get, Query } from "@nestjs/common";
import type { LinkPreview } from "@ntumie/types";
import { appError } from "../../common/errors/app-exception";
import { apiOk } from "../../common/utils/response.util";
import {
  canonicalizeUrl,
  localCollectionAddress,
  publicLinkUrl,
} from "../../common/utils/url.util";
import { PrismaService } from "../../database/prisma.service";
import { fetchPage, linkTitlesEnabled } from "./page-metadata";

// Looks up a link's title before it is saved, so the save form can show it.
// Available before sign-in, never under the write lock, with its own small request
// budget ("lookup"). Stored metadata answers first; otherwise the page is
// fetched (same SSRF guards as background lookups) and the result kept in the
// shared metadata, so saving the link needs no second fetch. Disabled under
// test unless LINK_TITLES=on.
@Controller("api/v1/link-preview")
export class LinkPreviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async preview(@Query("url") raw: unknown) {
    let url: string;
    try {
      if (typeof raw !== "string" || raw.length > 2048) throw new Error();
      const parsed = new URL(raw);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password)
        throw new Error();
      url = canonicalizeUrl(parsed.href);
    } catch {
      throw appError("bad_request");
    }
    if (localCollectionAddress(url))
      return apiOk<LinkPreview>({ url, title: null, status: "found", collectionHint: true });
    url = publicLinkUrl(url);
    const { title, missingHost } = linkTitlesEnabled()
      ? await this.title(url)
      : { title: null, missingHost: false };
    const preview: LinkPreview = {
      url,
      title,
      status: title ? "found" : missingHost ? "no_domain" : "untitled",
    };
    return apiOk(preview);
  }

  // Only a definite "no such host" for the address marks a typo; timeouts,
  // blocked sites and other failures stay saveable.
  private async title(url: string) {
    const known = await this.prisma.linkMetadata.findUnique({ where: { url } });
    if (known?.state === "ready" && known.title) return { title: known.title, missingHost: false };
    const { metadata, missingHost } = await fetchPage(url);
    if (!metadata) return { title: null, missingHost };
    const ready = { ...metadata, state: "ready", attempts: 0, fetchedAt: new Date() };
    await this.prisma.linkMetadata
      .upsert({ where: { url }, create: { url, ...ready }, update: ready })
      .catch(() => undefined); // A concurrent insert of the same address is fine.
    return { title: metadata.title, missingHost: false };
  }
}
