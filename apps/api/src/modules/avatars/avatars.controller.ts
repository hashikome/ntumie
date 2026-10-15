import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ApiProduces, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AvatarsService } from "./avatars.service";
import { AvatarQueryDto } from "./dto/avatar-query.dto";
import { UserAvatarService } from "./user-avatar.service";

@ApiTags("avatars")
@Controller("api/v1/avatars")
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}

  @Get(".svg")
  emptySeed() {
    throw new BadRequestException();
  }

  @Get(":seed.svg")
  @ApiProduces("image/svg+xml")
  get(
    @Param("seed") seed: string,
    @Query() query: AvatarQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(seed)) throw new BadRequestException();
    const { svg, etag } = this.avatars.render(seed, query.size);
    return sendSvg(req, res, svg, etag, "public, max-age=31536000, immutable");
  }
}

// A hub's generated mark (no media is stored). Not immutable: a hub may later
// gain another picture source behind this same address.
@ApiTags("avatars")
@Controller("api/v1/hubs")
export class HubAvatarController {
  constructor(private readonly avatars: AvatarsService) {}

  @Get(":hubId/avatar")
  @ApiProduces("image/svg+xml")
  get(
    @Param("hubId", new ParseUUIDPipe()) hubId: string,
    @Query() query: AvatarQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { svg, etag } = this.avatars.renderHubMark(hubId.toLowerCase(), query.size);
    return sendSvg(req, res, svg, etag, "public, max-age=86400");
  }
}

function sendSvg(req: Request, res: Response, svg: string, etag: string, cache: string) {
  res.set({
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": cache,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  // GET/HEAD use weak comparison; clients may send a list or wildcard.
  const matches = req
    .get("if-none-match")
    ?.split(",")
    .some((candidate) => {
      const value = candidate.trim();
      return value === "*" || value.replace(/^W\//, "") === etag;
    });
  return matches ? res.status(304).end() : res.status(200).send(svg);
}

@ApiTags("avatars")
@Controller("api/v1/users")
export class UserAvatarController {
  constructor(private readonly avatars: UserAvatarService) {}

  @Get(":id/avatar")
  async get(@Param("id", new ParseUUIDPipe()) id: string, @Res() res: Response) {
    res.set({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    const avatar = await this.avatars.resolve(id.toLowerCase());
    if ("location" in avatar) return res.redirect(302, avatar.location);
    return res.type(avatar.contentType).send(avatar.body);
  }
}
