import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deal } from './deal.schema';
import { toObjectResponse, toArrayResponse, generateId } from '../../shared/utils';
import { PaginatedResult } from '../../shared/dto/pagination.dto';
import { DomainEventsService } from '../../infrastructure/events/domain-events.service';

/**
 * Deals Service v2.0 - Full Sales Pipeline
 * 
 * Підтримує:
 * - Створення deal з lead + quote
 * - Фінансові оновлення (estimated vs real)
 * - Status pipeline з transition validation
 * - Прив'язка deposit
 * - Analytics aggregation
 */

// Status transitions
const DEAL_STATUS_TRANSITIONS: Record<string, string[]> = {
  'new': ['negotiation', 'waiting_deposit', 'cancelled'],
  'negotiation': ['waiting_deposit', 'cancelled'],
  'waiting_deposit': ['deposit_paid', 'cancelled'],
  'deposit_paid': ['purchased', 'cancelled'],
  'purchased': ['in_delivery', 'cancelled'],
  'in_delivery': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': ['new'],  // Можна реактивувати
};

@Injectable()
export class DealsService {
  constructor(
    @InjectModel(Deal.name) private dealModel: Model<Deal>,
    @InjectModel('Lead') private leadModel: Model<any>,
    @InjectModel('Quote') private quoteModel: Model<any>,
    @Optional() private domainEvents: DomainEventsService,
  ) {}

  // ============ CREATE FROM LEAD + QUOTE ============
  async createFromLead(data: {
    leadId: string;
    quoteId?: string;
    notes?: string;
  }, userId: string): Promise<any> {
    // Find lead by custom id field
    const lead = await this.leadModel.findOne({ id: data.leadId }).lean();
    
    if (!lead) throw new NotFoundException('Lead not found');

    // Get quote if provided or from lead metadata
    let quote: any = null;
    const quoteId = data.quoteId || (lead as any).metadata?.quoteId;
    
    if (quoteId) {
      quote = await this.quoteModel.findOne({
        $or: [{ _id: quoteId }, { quoteNumber: quoteId }]
      }).lean();
    }

    // Extract financial data
    const sourceScenario = quote?.selectedScenario || 'recommended';
    const clientPrice = quote?.scenarios?.[sourceScenario] || quote?.visibleTotal || (lead as any).price || 0;
    const internalCost = quote?.internalTotal || 0;
    const estimatedMargin = internalCost - clientPrice; // Hidden fee
    
    // Override tracking
    const overrideApplied = quote?.history?.some((h: any) => h.action === 'PRICE_OVERRIDE') || false;
    let overrideDelta = 0;
    
    if (overrideApplied && quote?.finalPrice) {
      overrideDelta = (quote.visibleTotal || 0) - quote.finalPrice;
    }

    const deal = new this.dealModel({
      id: generateId(),
      title: quote?.vehicleTitle || `Deal for ${(lead as any).firstName} ${(lead as any).lastName}`,
      customerId: (lead as any).convertedToCustomerId || undefined,
      leadId: String((lead as any)._id || (lead as any).id),
      quoteId: quote?._id ? String(quote._id) : undefined,
      vin: (lead as any).vin || quote?.vin,
      managerId: (lead as any).assignedTo,
      assignedTo: (lead as any).assignedTo,
      sourceScenario,
      purchasePrice: quote?.breakdown?.carPrice || 0,
      clientPrice,
      internalCost,
      estimatedMargin,
      value: clientPrice,
      overrideApplied,
      overrideDelta,
      vehicleTitle: quote?.vehicleTitle,
      vehiclePlaceholder: quote?.vehicleTitle || (lead as any).vin,
      status: 'new',
      notes: data.notes || '',
      createdBy: userId,
    });

    const saved = await deal.save();

    // Update lead status
    await this.leadModel.updateOne(
      { id: data.leadId },
      { 
        $set: { 
          status: 'converted',
          convertedToCustomerId: saved.customerId,
          'metadata.dealId': saved.id,
        } 
      }
    );

    // Update quote if exists
    if (quote) {
      await this.quoteModel.updateOne(
        { _id: quote._id },
        { 
          $set: { 
            convertedToLead: true,
            status: 'accepted',
          },
          $push: {
            history: {
              action: 'CONVERTED_TO_DEAL',
              timestamp: new Date(),
              userId,
              newValue: { dealId: saved.id }
            }
          }
        }
      );
    }

    const result = toObjectResponse(saved);

    // Emit domain event for Customer 360 orchestration
    if (this.domainEvents) {
      this.domainEvents.emitDealCreated({
        dealId: result.id,
        leadId: data.leadId,
        managerId: (lead as any).assignedTo,
        vin: result.vin || '',
        clientPrice: result.clientPrice || 0,
      });
    }

    return result;
  }

  // ============ STANDARD CRUD ============
  async create(data: any, userId: string): Promise<any> {
    const deal = new this.dealModel({
      id: generateId(),
      ...data,
      createdBy: userId,
    });
    const saved = await deal.save();
    return toObjectResponse(saved);
  }

  async findAll(query: any): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', status, customerId, assignedTo, leadId, search } = query;

    const filter: any = { isDeleted: false };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (leadId) filter.leadId = leadId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { vin: { $regex: search, $options: 'i' } },
        { vehicleTitle: { $regex: search, $options: 'i' } },
      ];
    }

    const [deals, total] = await Promise.all([
      this.dealModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.dealModel.countDocuments(filter),
    ]);

    return {
      data: toArrayResponse(deals),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<any> {
    const deal = await this.dealModel.findOne({ 
      id,
      isDeleted: false 
    }).lean();
    return deal ? toObjectResponse(deal) : null;
  }

  async findByLeadId(leadId: string): Promise<any> {
    const deal = await this.dealModel.findOne({ leadId, isDeleted: false }).lean();
    return deal ? toObjectResponse(deal) : null;
  }

  // ============ STATUS UPDATE ============
  async updateStatus(id: string, newStatus: string, notes?: string): Promise<any> {
    const deal = await this.dealModel.findOne({ 
      id,
      isDeleted: false 
    });
    
    if (!deal) throw new NotFoundException('Deal not found');

    const allowed = DEAL_STATUS_TRANSITIONS[deal.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${deal.status} to ${newStatus}`);
    }

    const update: any = { status: newStatus };
    
    if (notes) update.notes = notes;
    
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      update.closedAt = new Date();
      
      // Calculate real profit on completion
      if (newStatus === 'completed') {
        update.realProfit = (deal.realRevenue || deal.clientPrice) - (deal.realCost || deal.internalCost);
      }
    }

    const updated = await this.dealModel.findOneAndUpdate(
      { id },
      { $set: update },
      { new: true }
    ).lean();

    // Emit domain event for Customer 360 orchestration
    if (updated && this.domainEvents) {
      this.domainEvents.emitDealStatusChanged({
        dealId: id,
        status: newStatus,
        managerId: (updated as any).managerId,
        notes,
      });
    }

    return updated ? toObjectResponse(updated) : null;
  }

  // ============ FINANCE UPDATE ============
  async updateFinance(id: string, data: {
    purchasePrice?: number;
    clientPrice?: number;
    internalCost?: number;
    realCost?: number;
    realRevenue?: number;
  }): Promise<any> {
    const deal = await this.dealModel.findOne({ 
      id,
      isDeleted: false 
    });
    
    if (!deal) throw new NotFoundException('Deal not found');

    const purchasePrice = data.purchasePrice ?? deal.purchasePrice ?? 0;
    const clientPrice = data.clientPrice ?? deal.clientPrice ?? 0;
    const internalCost = data.internalCost ?? deal.internalCost ?? 0;
    const realCost = data.realCost ?? deal.realCost ?? internalCost;
    const realRevenue = data.realRevenue ?? deal.realRevenue ?? clientPrice;

    const estimatedMargin = internalCost - clientPrice;
    const realProfit = realRevenue - realCost;

    const updated = await this.dealModel.findOneAndUpdate(
      { id },
      { 
        $set: {
          purchasePrice,
          clientPrice,
          internalCost,
          realCost,
          realRevenue,
          estimatedMargin,
          realProfit,
          value: clientPrice,
        }
      },
      { new: true }
    ).lean();

    return updated ? toObjectResponse(updated) : null;
  }

  // ============ BIND DEPOSIT ============
  async bindDeposit(id: string, depositId: string): Promise<any> {
    const updated = await this.dealModel.findOneAndUpdate(
      { id, isDeleted: false },
      { 
        $set: { 
          depositId,
          status: 'deposit_paid',
        }
      },
      { new: true }
    ).lean();

    return updated ? toObjectResponse(updated) : null;
  }

  // ============ STANDARD UPDATE ============
  async update(id: string, data: any): Promise<any> {
    // Status validation
    if (data.status) {
      const current = await this.dealModel.findOne({ 
        id,
        isDeleted: false 
      });
      
      if (current) {
        const allowed = DEAL_STATUS_TRANSITIONS[current.status] || [];
        if (!allowed.includes(data.status)) {
          throw new BadRequestException(`Cannot transition from ${current.status} to ${data.status}`);
        }
        
        if (data.status === 'completed' || data.status === 'cancelled') {
          data.closedAt = new Date();
        }
      }
    }

    const deal = await this.dealModel.findOneAndUpdate(
      { id, isDeleted: false },
      { $set: data },
      { new: true },
    ).lean();
    
    return deal ? toObjectResponse(deal) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dealModel.findOneAndUpdate(
      { id }, 
      { $set: { isDeleted: true } }
    );
    return !!result;
  }

  // ============ STATS & ANALYTICS ============
  async getStats(): Promise<any> {
    const [total, byStatus, financials] = await Promise.all([
      this.dealModel.countDocuments({ isDeleted: false }),
      this.dealModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$clientPrice' } } },
      ]),
      this.dealModel.aggregate([
        { $match: { isDeleted: false } },
        { 
          $group: { 
            _id: null, 
            totalClientPrice: { $sum: '$clientPrice' },
            totalEstimatedMargin: { $sum: '$estimatedMargin' },
            totalRealProfit: { $sum: '$realProfit' },
            completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          } 
        },
      ]),
    ]);

    return {
      total,
      totalValue: financials[0]?.totalClientPrice || 0,
      totalEstimatedMargin: financials[0]?.totalEstimatedMargin || 0,
      totalRealProfit: financials[0]?.totalRealProfit || 0,
      completedDeals: financials[0]?.completedCount || 0,
      cancelledDeals: financials[0]?.cancelledCount || 0,
      byStatus: byStatus.reduce((acc, { _id, count, value }) => ({ 
        ...acc, 
        [_id]: { count, value } 
      }), {}),
    };
  }

  // ============ PIPELINE ANALYTICS ============
  async getPipelineAnalytics(): Promise<any> {
    // Quote → Lead → Deal conversion
    const [quoteCount, leadCount, dealCount, completedCount] = await Promise.all([
      this.quoteModel.countDocuments({}),
      this.leadModel.countDocuments({ isDeleted: { $ne: true } }),
      this.dealModel.countDocuments({ isDeleted: false }),
      this.dealModel.countDocuments({ isDeleted: false, status: 'completed' }),
    ]);

    // Manager performance
    const managerPerformance = await this.dealModel.aggregate([
      { $match: { isDeleted: false, managerId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$managerId',
          totalDeals: { $sum: 1 },
          completedDeals: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalClientPrice: { $sum: '$clientPrice' },
          totalEstimatedMargin: { $sum: '$estimatedMargin' },
          totalRealProfit: { $sum: '$realProfit' },
          overrideCount: { $sum: { $cond: ['$overrideApplied', 1, 0] } },
          overrideLoss: { $sum: '$overrideDelta' },
        }
      },
      {
        $project: {
          _id: 0,
          managerId: '$_id',
          totalDeals: 1,
          completedDeals: 1,
          completionRate: {
            $cond: [
              { $gt: ['$totalDeals', 0] },
              { $round: [{ $multiply: [{ $divide: ['$completedDeals', '$totalDeals'] }, 100] }, 2] },
              0
            ]
          },
          totalClientPrice: 1,
          totalEstimatedMargin: 1,
          totalRealProfit: 1,
          overrideCount: 1,
          overrideLoss: 1,
        }
      },
      { $sort: { totalDeals: -1 } }
    ]);

    // Scenario performance
    const scenarioPerformance = await this.dealModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$sourceScenario',
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalMargin: { $sum: '$estimatedMargin' },
          totalProfit: { $sum: '$realProfit' },
        }
      },
      {
        $project: {
          _id: 0,
          scenario: '$_id',
          count: 1,
          completed: 1,
          completionRate: {
            $cond: [
              { $gt: ['$count', 0] },
              { $round: [{ $multiply: [{ $divide: ['$completed', '$count'] }, 100] }, 2] },
              0
            ]
          },
          totalMargin: 1,
          totalProfit: 1,
        }
      }
    ]);

    return {
      funnel: {
        quotes: quoteCount,
        leads: leadCount,
        deals: dealCount,
        completed: completedCount,
        quoteToLeadRate: leadCount > 0 && quoteCount > 0 ? Math.round((leadCount / quoteCount) * 100) : 0,
        leadToDealRate: dealCount > 0 && leadCount > 0 ? Math.round((dealCount / leadCount) * 100) : 0,
        dealCompletionRate: completedCount > 0 && dealCount > 0 ? Math.round((completedCount / dealCount) * 100) : 0,
      },
      managerPerformance,
      scenarioPerformance,
    };
  }
}
