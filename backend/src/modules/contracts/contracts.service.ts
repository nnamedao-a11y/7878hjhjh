/**
 * Contracts Service
 * 
 * Handles contract creation, sending, and e-signature tracking
 * 
 * NOTE: This uses a simple internal signing flow.
 * For production DocuSign integration, implement DocuSign API calls.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contract, ContractStatus, ContractType } from './contract.schema';
import { generateId, toObjectResponse } from '../../shared/utils';

export interface CreateContractDto {
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  dealId?: string;
  leadId?: string;
  type: ContractType;
  title: string;
  description?: string;
  vin?: string;
  vehicleTitle?: string;
  price?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private configService: ConfigService,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel('Deal') private dealModel: Model<any>,
    @InjectModel('Invoice') private invoiceModel: Model<any>,
  ) {}

  // === CREATE CONTRACT ===
  
  async createContract(dto: CreateContractDto, createdBy?: string): Promise<Contract> {
    const contract = new this.contractModel({
      id: generateId(),
      ...dto,
      status: ContractStatus.DRAFT,
      createdBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await contract.save();
    this.logger.log(`Contract created: ${contract.id} (${dto.type})`);

    return contract;
  }

  // === SEND CONTRACT FOR SIGNING ===
  
  async sendContract(contractId: string, originUrl: string): Promise<{ signingUrl: string }> {
    const contract = await this.contractModel.findOne({ id: contractId });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status === ContractStatus.SIGNED) {
      throw new BadRequestException('Contract already signed');
    }

    // Generate signing URL (internal flow)
    // In production: use DocuSign API to create envelope
    const signingToken = Buffer.from(`${contract.id}:${Date.now()}`).toString('base64');
    const signingUrl = `${originUrl}/sign/${signingToken}`;

    contract.status = ContractStatus.SENT;
    contract.sentAt = new Date();
    contract.signingUrl = signingUrl;
    contract.envelopeId = `env_${contract.id}`;
    await contract.save();

    this.logger.log(`Contract sent: ${contract.id}`);

    return { signingUrl };
  }

  // === MARK CONTRACT AS VIEWED ===
  
  async markViewed(contractId: string): Promise<any> {
    const contract = await this.contractModel.findOneAndUpdate(
      { id: contractId, status: ContractStatus.SENT },
      { $set: { status: ContractStatus.VIEWED, viewedAt: new Date() } },
      { new: true }
    );

    if (contract) {
      this.logger.log(`Contract viewed: ${contract.id}`);
    }

    return contract;
  }

  // === SIGN CONTRACT ===
  
  async signContract(contractId: string, signatureData?: any): Promise<Contract> {
    const contract = await this.contractModel.findOne({ id: contractId });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status === ContractStatus.SIGNED) {
      throw new BadRequestException('Contract already signed');
    }

    if (contract.status === ContractStatus.REJECTED) {
      throw new BadRequestException('Contract was rejected');
    }

    contract.status = ContractStatus.SIGNED;
    contract.signedAt = new Date();
    contract.metadata = { ...contract.metadata, signatureData };
    await contract.save();

    // Update deal if connected
    if (contract.dealId) {
      await this.dealModel.updateOne(
        { id: contract.dealId },
        { 
          $set: { 
            hasSignedContract: true,
            contractSignedAt: new Date(),
          },
          $push: { signedContracts: contract.id },
        }
      );
    }

    this.logger.log(`Contract signed: ${contract.id}`);

    return contract;
  }

  // === REJECT CONTRACT ===
  
  async rejectContract(contractId: string, reason?: string): Promise<any> {
    const contract = await this.contractModel.findOneAndUpdate(
      { id: contractId },
      { 
        $set: { 
          status: ContractStatus.REJECTED, 
          rejectedAt: new Date(),
          rejectionReason: reason || 'Customer rejected',
        } 
      },
      { new: true }
    );

    if (contract) {
      this.logger.log(`Contract rejected: ${contract.id}`);
    }

    return contract;
  }

  // === CHECK IF CONTRACT REQUIRED FOR PAYMENT ===
  
  async isContractSignedForDeal(dealId: string): Promise<boolean> {
    const signedContract = await this.contractModel.findOne({
      dealId,
      status: ContractStatus.SIGNED,
    });

    return !!signedContract;
  }

  // === GET CONTRACT ===
  
  async getContract(contractId: string): Promise<any> {
    const contract = await this.contractModel.findOne({ id: contractId }).lean();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    return toObjectResponse(contract);
  }

  // === GET USER CONTRACTS ===
  
  async getUserContracts(customerId: string): Promise<any[]> {
    const contracts = await this.contractModel.find({ customerId })
      .sort({ createdAt: -1 })
      .lean();
    
    return contracts.map(c => toObjectResponse(c));
  }

  // === GET DEAL CONTRACTS ===
  
  async getDealContracts(dealId: string): Promise<any[]> {
    const contracts = await this.contractModel.find({ dealId })
      .sort({ createdAt: -1 })
      .lean();
    
    return contracts.map(c => toObjectResponse(c));
  }

  // === GET PENDING CONTRACTS (ADMIN) ===
  
  async getPendingContracts(): Promise<any[]> {
    const contracts = await this.contractModel.find({
      status: { $in: [ContractStatus.DRAFT, ContractStatus.SENT, ContractStatus.VIEWED] },
    })
      .sort({ createdAt: -1 })
      .lean();
    
    return contracts.map(c => toObjectResponse(c));
  }

  // === GET ANALYTICS ===
  
  async getAnalytics(periodDays: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [total, byStatus, recentSigned] = await Promise.all([
      this.contractModel.countDocuments({ createdAt: { $gte: startDate } }),
      this.contractModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.contractModel.find({ status: ContractStatus.SIGNED, signedAt: { $gte: startDate } })
        .sort({ signedAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      signedCount: byStatus.find(s => s._id === ContractStatus.SIGNED)?.count || 0,
      recentSigned: recentSigned.map(c => toObjectResponse(c)),
      periodDays,
    };
  }
}
