import { type CaptureLink, type CaptureRequest, maxNoteLength } from "@ntumie/types";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CaptureLinkDto implements CaptureLink {
  @IsUrl({
    require_protocol: true,
    protocols: ["http", "https"],
    require_valid_protocol: true,
    disallow_auth: true,
    // Whether the host is public is decided by publicLinkUrl (link_not_public).
    require_tld: false,
  })
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(maxNoteLength)
  note?: string;
}

export class CaptureDto implements CaptureRequest {
  @IsOptional() @IsBoolean() published?: boolean;
  @IsInt()
  @Min(1)
  startedAt: number;

  @IsUUID()
  operationId: string;

  // One link per save; many links are what import is for.
  @IsDefined()
  @ValidateNested()
  @Type(() => CaptureLinkDto)
  link: CaptureLinkDto;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsString()
  @MaxLength(36)
  destination: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  collectionTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  collectionDescription?: string;
}
