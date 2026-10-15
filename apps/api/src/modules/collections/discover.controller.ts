import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { apiOk } from "src/common/utils/response.util";
import { CollectionsService } from "./collections.service";
import {
  DiscoverHubsQueryDto,
  DiscoverListQueryDto,
  DiscoverQueryDto,
} from "./dto/discover-query.dto";
import { GuidesQueryDto } from "./dto/guides-query.dto";

// Product-wide public discovery surface: published collections only.
// Literal routes are declared before any parameter route.
@ApiTags("discover")
@Controller("api/v1/discover")
export class DiscoverController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get("guides")
  async guides(@Query() query: GuidesQueryDto) {
    return apiOk(await this.collectionsService.discoverGuides(query.limit ?? 3));
  }

  @Get("overview")
  async overview() {
    return apiOk(await this.collectionsService.discoverOverview());
  }

  @Get("popular")
  async popular(@Query() query: DiscoverListQueryDto) {
    return apiOk(await this.collectionsService.discoverPopular(query.limit ?? 12));
  }

  @Get("hubs")
  async hubs(@Query() query: DiscoverHubsQueryDto) {
    return apiOk(
      await this.collectionsService.discoverHubs(query.limit ?? 12, query.order ?? "popular"),
    );
  }

  @Get("tags")
  async tags(@Query() query: DiscoverListQueryDto) {
    return apiOk(await this.collectionsService.popularTags(query.limit ?? 8));
  }

  @Get()
  async discover(@Query() query: DiscoverQueryDto) {
    const data = await this.collectionsService.discover(query, query.tag);
    return apiOk(data.items, data.meta);
  }
}
