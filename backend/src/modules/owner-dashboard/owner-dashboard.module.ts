/**
 * Owner Dashboard Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OwnerDashboardController } from './owner-dashboard.controller';
import { OwnerDashboardService } from './owner-dashboard.service';
import { Invoice, InvoiceSchema } from '../payments/invoice.schema';
import { Shipment, ShipmentSchema } from '../shipping/shipment.schema';
import { Contract, ContractSchema } from '../contracts/contract.schema';
import { Deal, DealSchema } from '../deals/deal.schema';
import { User, UserSchema } from '../users/user.schema';
import { InvoiceEscalationState, InvoiceEscalationStateSchema } from '../invoice-reminders/invoice-escalation-state.schema';
import { ShipmentAlertLog, ShipmentAlertLogSchema } from '../shipment-alerts/shipment-alert-log.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Shipment.name, schema: ShipmentSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Deal.name, schema: DealSchema },
      { name: User.name, schema: UserSchema },
      { name: InvoiceEscalationState.name, schema: InvoiceEscalationStateSchema },
      { name: ShipmentAlertLog.name, schema: ShipmentAlertLogSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [OwnerDashboardController],
  providers: [OwnerDashboardService],
  exports: [OwnerDashboardService],
})
export class OwnerDashboardModule {}
