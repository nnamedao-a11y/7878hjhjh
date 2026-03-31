/**
 * Shipping Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { Shipment, ShipmentSchema } from './shipment.schema';
import { ShipmentEvent, ShipmentEventSchema } from './shipment-event.schema';
import { PaymentFlowModule } from '../payment-flow/payment-flow.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shipment.name, schema: ShipmentSchema },
      { name: ShipmentEvent.name, schema: ShipmentEventSchema },
    ]),
    forwardRef(() => PaymentFlowModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
