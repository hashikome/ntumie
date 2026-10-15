import { Module } from "@nestjs/common";
import { AvatarsController, HubAvatarController, UserAvatarController } from "./avatars.controller";
import { AvatarsService } from "./avatars.service";
import { GravatarService } from "./gravatar.service";
import { UserAvatarService } from "./user-avatar.service";

@Module({
  controllers: [AvatarsController, HubAvatarController, UserAvatarController],
  providers: [AvatarsService, GravatarService, UserAvatarService],
})
export class AvatarsModule {}
