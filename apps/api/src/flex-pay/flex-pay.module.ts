import { Module } from "@nestjs/common";
import { PushModule } from "../push/push.module";
import { FlexPayService } from "./flex-pay.service";
import { FlexPayController } from "./flex-pay.controller";
@Module({
  imports: [PushModule],
  providers: [FlexPayService],
  controllers: [FlexPayController],
  exports: [FlexPayService],
})
export class FlexPayModule {}
