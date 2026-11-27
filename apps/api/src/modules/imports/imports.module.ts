import { Module } from "@nestjs/common";
import { CollectionsModule } from "../collections/collections.module";
import { ResourcesModule } from "../resources/resources.module";
import { ImportsController } from "./imports.controller";
import { ImportsService } from "./imports.service";

@Module({
  imports: [CollectionsModule, ResourcesModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
