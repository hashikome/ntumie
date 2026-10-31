import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { OptionalAuthGuard } from "src/common/guards/optional-auth.guard";
import type { AuthUser } from "src/common/interfaces/auth-user.interface";
import { apiOk } from "src/common/utils/response.util";
import { DiscoverSearchQueryDto, HubSearchQueryDto } from "./dto/discover-search.dto";
import { SearchService } from "./search.service";

// Public search over Discover (published collections and public hubs).
@ApiTags("discover")
@Controller("api/v1/discover/search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  async discover(@Query() query: DiscoverSearchQueryDto) {
    const { data, nextCursor } = await this.search.discover(query);
    return apiOk(data, { nextCursor });
  }
}

// Search inside one hub: what the viewer can read, through the policy service.
@ApiTags("hubs")
@Controller("api/v1/hubs")
export class HubSearchController {
  constructor(private readonly search: SearchService) {}

  @UseGuards(OptionalAuthGuard)
  @Get(":hubId/search")
  async hub(
    @Param("hubId", new ParseUUIDPipe()) hubId: string,
    @Query() query: HubSearchQueryDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    return apiOk(await this.search.hub(hubId, query.q, user));
  }
}
