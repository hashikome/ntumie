import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { CursorQueryDto } from "src/common/dto/cursor-query.dto";

export class DiscoverQueryDto extends CursorQueryDto {
  /** Only collections carrying this tag. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  tag?: string;
}

export class DiscoverListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number;
}

export class DiscoverHubsQueryDto extends DiscoverListQueryDto {
  @IsOptional()
  @IsIn(["popular", "newest"])
  order?: "popular" | "newest";
}
