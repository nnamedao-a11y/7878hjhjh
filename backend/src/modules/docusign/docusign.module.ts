/**
 * DocuSign Module
 * 
 * Real e-signature integration
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DocusignController } from './docusign.controller';
import { DocusignService } from './docusign.service';
import { DocusignAuthService } from './docusign-auth.service';
import { ContractEnvelope, ContractEnvelopeSchema } from './contract-envelope.schema';
import { Contract, ContractSchema } from '../contracts/contract.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: ContractEnvelope.name, schema: ContractEnvelopeSchema },
      { name: 'Contract', schema: ContractSchema },
    ]),
  ],
  controllers: [DocusignController],
  providers: [DocusignService, DocusignAuthService],
  exports: [DocusignService],
})
export class DocusignModule {}
