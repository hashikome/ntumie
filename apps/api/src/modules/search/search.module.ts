import { Module } from "@nestjs/common";
import { CollectionsModule } from "../collections/collections.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [CollectionsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
