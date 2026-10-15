import { type InterestFeature, interestFeatures } from "@ntumie/types";
import { IsIn } from "class-validator";

export class InterestDto {
  @IsIn(interestFeatures)
  feature: InterestFeature;
}
