import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import type { CaptureDestination, CollectionNameSuggestion } from "@ntumie/types";
import { isUUID } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthGuard } from "../../common/guards/auth.guard";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { apiOk } from "../../common/utils/response.util";
import { CaptureService } from "./capture.service";
import { CaptureDto } from "./dto/capture.dto";
@Controller("api/v1/capture")
@UseGuards(AuthGuard)
export class CaptureController {
  constructor(private readonly capture: CaptureService) {}
  @Get("suggested-name")
  async suggestedName(@CurrentUser() user: AuthUser) {
    return apiOk<CollectionNameSuggestion>({ title: await this.capture.suggestedTitle(user) });
  }

  // `here`, when it names a collection, is the one the person is on.
  @Get("destinations")
  async destinations(@CurrentUser() user: AuthUser, @Query("here") here?: string) {
    return apiOk<CaptureDestination[]>(
      await this.capture.destinations(user, isUUID(here) ? here : undefined),
    );
  }

  @Post()
  async save(@CurrentUser() user: AuthUser, @Body() dto: CaptureDto) {
    return apiOk(await this.capture.save(user, dto));
  }
}
