import {
  type CreateCommentRequest,
  maxCommentLength,
  type UpdateCommentRequest,
} from "@ntumie/types";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { CursorQueryDto } from "src/common/dto/cursor-query.dto";

export class CommentQueryDto extends CursorQueryDto {
  @IsOptional()
  @IsUUID()
  replyTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  replyCursor?: string;

  /** Only questions with an answer (the Discussion's Answered filter). */
  @IsOptional()
  @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : value))
  @IsBoolean()
  answered?: boolean;
}

export class CreateCommentDto implements CreateCommentRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(maxCommentLength)
  body: string;

  // Present for a reply; replies are one level deep.
  @IsOptional()
  @IsUUID()
  parentId?: string;

  // Questions only: the section (heading) the question is about.
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  // Questions only: the link item attached from its Discuss action.
  @IsOptional()
  @IsUUID()
  itemId?: string;
}

export class UpdateCommentDto implements UpdateCommentRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(maxCommentLength)
  body: string;

  @IsInt()
  @Min(1)
  version: number;
}
