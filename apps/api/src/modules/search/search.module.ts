import { Module } from "@nestjs/common";
import { CollectionsModule } from "../collections/collections.module";
import { HubsModule } from "../hubs/hubs.module";
import { HubSearchController, SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [CollectionsModule, HubsModule],
  controllers: [SearchController, HubSearchController],
  providers: [SearchService],
})
export class SearchModule {}
