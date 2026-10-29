import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { apiOk } from "src/common/utils/response.util";
import { DiscoverSearchQueryDto } from "./dto/discover-search.dto";
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
