import { maxSearchLength } from "@ntumie/types";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { CursorQueryDto } from "../../../common/dto/cursor-query.dto";

export class DiscoverSearchQueryDto extends CursorQueryDto {
  /** The search text (longer text is cut, never rejected). */
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.slice(0, maxSearchLength) : value))
  @MaxLength(maxSearchLength)
  q!: string;

  /** Only collections carrying this tag. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  tag?: string;

  /** Everything (hubs preview and collections) or the full list of hubs. */
  @IsOptional()
  @IsIn(["all", "hubs"])
  scope?: "all" | "hubs";
}
