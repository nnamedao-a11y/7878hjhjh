/**
 * Invoice Reminder Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { InvoiceReminderController } from './invoice-reminder.controller';
import { InvoiceReminderService } from './invoice-reminder.service';
import { InvoiceReminderLog, InvoiceReminderLogSchema } from './invoice-reminder-log.schema';
import { InvoiceEscalationState, InvoiceEscalationStateSchema } from './invoice-escalation-state.schema';
import { Invoice, InvoiceSchema } from '../payments/invoice.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: InvoiceReminderLog.name, schema: InvoiceReminderLogSchema },
      { name: InvoiceEscalationState.name, schema: InvoiceEscalationStateSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [InvoiceReminderController],
  providers: [InvoiceReminderService],
  exports: [InvoiceReminderService],
})
export class InvoiceReminderModule {}
