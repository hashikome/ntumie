import { Module } from "@nestjs/common";
import { InterestController } from "./interest.controller";

@Module({ controllers: [InterestController] })
export class InterestModule {}
