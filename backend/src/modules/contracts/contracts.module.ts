/**
 * Contracts Module
 * 
 * E-signature contract management
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { Contract, ContractSchema } from './contract.schema';
import { Deal, DealSchema } from '../deals/deal.schema';
import { Invoice, InvoiceSchema } from '../payments/invoice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: 'Deal', schema: DealSchema },
      { name: 'Invoice', schema: InvoiceSchema },
    ]),
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
