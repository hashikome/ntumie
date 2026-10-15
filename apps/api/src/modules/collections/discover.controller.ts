import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CursorQueryDto } from "src/common/dto/cursor-query.dto";
import { apiOk } from "src/common/utils/response.util";
import { CollectionsService } from "./collections.service";
import { GuidesQueryDto } from "./dto/guides-query.dto";

// Product-wide public discovery surface: published collections only.
@ApiTags("discover")
@Controller("api/v1/discover")
export class DiscoverController {
  constructor(private readonly collectionsService: CollectionsService) {}

  // Literal route declared before any parameter route.
  @Get("guides")
  async guides(@Query() query: GuidesQueryDto) {
    return apiOk(await this.collectionsService.discoverGuides(query.limit ?? 3));
  }

  @Get()
  async discover(@Query() query: CursorQueryDto) {
    const data = await this.collectionsService.discover(query);
    return apiOk(data.items, data.meta);
  }
}
