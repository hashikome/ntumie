import { type CreateCollectionRequest, maxDescriptionLength } from "@ntumie/types";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCollectionDto implements CreateCollectionRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(maxDescriptionLength)
  description?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
