import { Body, Controller, Header, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { OptionalAuthGuard } from "src/common/guards/optional-auth.guard";
import type { AuthUser } from "src/common/interfaces/auth-user.interface";
import { apiOk } from "src/common/utils/response.util";
import { PrismaService } from "src/database/prisma.service";
import { InterestDto } from "./dto/interest.dto";

// Fake doors: a designed control whose feature is not built yet records that
// someone used it, so demand decides what is built next. Nothing but the
// feature key and, when signed in, the person is kept.
@ApiTags("interest")
@Controller("api/v1/interest")
export class InterestController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(OptionalAuthGuard)
  @Header("Cache-Control", "private, no-store")
  @ApiOperation({ summary: "Record interest in a feature that is on the way" })
  async record(@Body() body: InterestDto, @CurrentUser() viewer: AuthUser | null) {
    await this.prisma.featureInterest.create({
      data: { feature: body.feature, userId: viewer?.userId ?? null },
    });
    return apiOk({ feature: body.feature, recorded: true });
  }
}
