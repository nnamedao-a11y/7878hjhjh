/**
 * Owner Dashboard Service
 * 
 * Aggregates all business metrics for the owner dashboard
 * 
 * Sections:
 * - Revenue: total revenue, paid, unpaid, overdue
 * - Funnel: contracts → payments → shipments → delivery
 * - Shipping: active, delayed, stalled, delivered
 * - Risk: critical overdue, stalled shipments, risky managers
 * - Team: manager performance metrics
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceStatus } from '../payments/invoice.schema';
import { Shipment, ShipmentStatus } from '../shipping/shipment.schema';
import { Contract } from '../contracts/contract.schema';
import { Deal } from '../deals/deal.schema';
import { User } from '../users/user.schema';
import { InvoiceEscalationState } from '../invoice-reminders/invoice-escalation-state.schema';
import { ShipmentAlertLog, ShipmentAlertType } from '../shipment-alerts/shipment-alert-log.schema';

export interface OwnerDashboardResponse {
  revenue: {
    totalRevenue: number;
    totalPaidInvoices: number;
    totalUnpaidInvoices: number;
    overdueAmount: number;
    avgPaymentDelayDays: number;
    avgDealValue: number;
    revenueGrowth: number;
  };
  funnel: {
    contractsCreated: number;
    contractsSigned: number;
    invoicesSent: number;
    invoicesPaid: number;
    shipmentsStarted: number;
    delivered: number;
  };
  shipping: {
    activeShipments: number;
    delayedShipments: number;
    stalledShipments: number;
    deliveredShipments: number;
    avgTransitDays: number;
    onTimeDeliveryRate: number;
  };
  risk: {
    criticalOverdueInvoices: number;
    stalledShipments: number;
    riskyManagers: number;
    totalAtRiskAmount: number;
  };
  team: Array<{
    managerId: string;
    managerName: string;
    email: string;
    totalDeals: number;
    revenue: number;
    paidRate: number;
    overdueCount: number;
    shipmentDelayCount: number;
    avgPaymentDays: number;
  }>;
  period: {
    start: Date;
    end: Date;
    days: number;
  };
}

@Injectable()
export class OwnerDashboardService {
  private readonly logger = new Logger(OwnerDashboardService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(Deal.name) private dealModel: Model<Deal>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(InvoiceEscalationState.name) private escalationModel: Model<InvoiceEscalationState>,
    @InjectModel(ShipmentAlertLog.name) private alertLogModel: Model<ShipmentAlertLog>,
  ) {}

  /**
   * Get full owner dashboard
   */
  async getDashboard(periodDays: number = 30): Promise<OwnerDashboardResponse> {
    const endDate = new Date();
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [revenue, funnel, shipping, risk, team] = await Promise.all([
      this.getRevenueBlock(startDate, endDate),
      this.getFunnelBlock(startDate, endDate),
      this.getShippingBlock(startDate, endDate),
      this.getRiskBlock(),
      this.getTeamBlock(startDate, endDate),
    ]);

    return {
      revenue,
      funnel,
      shipping,
      risk,
      team,
      period: {
        start: startDate,
        end: endDate,
        days: periodDays,
      },
    };
  }

  /**
   * Revenue block
   */
  async getRevenueBlock(startDate: Date, endDate: Date): Promise<OwnerDashboardResponse['revenue']> {
    const [
      totalPaid,
      totalUnpaid,
      overdueAmount,
      avgPaymentDelay,
      avgDealValue,
      prevPeriodRevenue,
    ] = await Promise.all([
      this.invoiceModel.aggregate([
        { $match: { status: InvoiceStatus.PAID, paidAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { status: { $in: [InvoiceStatus.SENT, InvoiceStatus.PENDING] } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { status: InvoiceStatus.OVERDUE } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { status: InvoiceStatus.PAID, paidAt: { $exists: true }, sentAt: { $exists: true } } },
        { $project: { delay: { $subtract: ['$paidAt', '$sentAt'] } } },
        { $group: { _id: null, avgDelay: { $avg: '$delay' } } },
      ]),
      this.dealModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, avgValue: { $avg: '$totalValue' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { status: InvoiceStatus.PAID, paidAt: { $gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), $lt: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const currentRevenue = totalPaid[0]?.total || 0;
    const prevRevenue = prevPeriodRevenue[0]?.total || 0;
    const growth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      totalRevenue: currentRevenue,
      totalPaidInvoices: totalPaid[0]?.count || 0,
      totalUnpaidInvoices: totalUnpaid[0]?.count || 0,
      overdueAmount: overdueAmount[0]?.total || 0,
      avgPaymentDelayDays: avgPaymentDelay[0]?.avgDelay 
        ? Math.round(avgPaymentDelay[0].avgDelay / (1000 * 60 * 60 * 24))
        : 0,
      avgDealValue: avgDealValue[0]?.avgValue || 0,
      revenueGrowth: Math.round(growth * 10) / 10,
    };
  }

  /**
   * Funnel block
   */
  async getFunnelBlock(startDate: Date, endDate: Date): Promise<OwnerDashboardResponse['funnel']> {
    const [
      contractsCreated,
      contractsSigned,
      invoicesSent,
      invoicesPaid,
      shipmentsStarted,
      delivered,
    ] = await Promise.all([
      this.contractModel.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      this.contractModel.countDocuments({ status: 'signed', createdAt: { $gte: startDate, $lte: endDate } }),
      this.invoiceModel.countDocuments({ sentAt: { $gte: startDate, $lte: endDate } }),
      this.invoiceModel.countDocuments({ status: InvoiceStatus.PAID, paidAt: { $gte: startDate, $lte: endDate } }),
      this.shipmentModel.countDocuments({ trackingActive: true, createdAt: { $gte: startDate, $lte: endDate } }),
      this.shipmentModel.countDocuments({ currentStatus: ShipmentStatus.DELIVERED, actualDeliveryDate: { $gte: startDate, $lte: endDate } }),
    ]);

    return {
      contractsCreated,
      contractsSigned,
      invoicesSent,
      invoicesPaid,
      shipmentsStarted,
      delivered,
    };
  }

  /**
   * Shipping block
   */
  async getShippingBlock(startDate: Date, endDate: Date): Promise<OwnerDashboardResponse['shipping']> {
    const now = new Date();

    const [
      active,
      delayed,
      stalled,
      delivered,
      avgTransit,
      onTimeCount,
      totalDelivered,
    ] = await Promise.all([
      this.shipmentModel.countDocuments({
        currentStatus: { $nin: [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED] },
      }),
      this.shipmentModel.countDocuments({
        currentStatus: { $nin: [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED] },
        eta: { $lt: now },
      }),
      this.alertLogModel.countDocuments({
        alertType: ShipmentAlertType.STALLED,
        resolvedAt: { $exists: false },
      }),
      this.shipmentModel.countDocuments({
        currentStatus: ShipmentStatus.DELIVERED,
        actualDeliveryDate: { $gte: startDate, $lte: endDate },
      }),
      this.shipmentModel.aggregate([
        {
          $match: {
            currentStatus: ShipmentStatus.DELIVERED,
            actualDeliveryDate: { $exists: true },
            actualPickupDate: { $exists: true },
          },
        },
        {
          $project: {
            transit: { $subtract: ['$actualDeliveryDate', '$actualPickupDate'] },
          },
        },
        { $group: { _id: null, avg: { $avg: '$transit' } } },
      ]),
      this.shipmentModel.countDocuments({
        currentStatus: ShipmentStatus.DELIVERED,
        $expr: { $lte: ['$actualDeliveryDate', '$eta'] },
      }),
      this.shipmentModel.countDocuments({
        currentStatus: ShipmentStatus.DELIVERED,
      }),
    ]);

    return {
      activeShipments: active,
      delayedShipments: delayed,
      stalledShipments: stalled,
      deliveredShipments: delivered,
      avgTransitDays: avgTransit[0]?.avg 
        ? Math.round(avgTransit[0].avg / (1000 * 60 * 60 * 24))
        : 0,
      onTimeDeliveryRate: totalDelivered > 0 
        ? Math.round((onTimeCount / totalDelivered) * 100)
        : 0,
    };
  }

  /**
   * Risk block
   */
  async getRiskBlock(): Promise<OwnerDashboardResponse['risk']> {
    const [
      criticalOverdue,
      stalledShipments,
      atRiskAmount,
    ] = await Promise.all([
      this.escalationModel.countDocuments({ criticalOverdue: true, resolvedAt: { $exists: false } }),
      this.alertLogModel.countDocuments({ alertType: ShipmentAlertType.STALLED, resolvedAt: { $exists: false } }),
      this.invoiceModel.aggregate([
        { $match: { status: InvoiceStatus.OVERDUE } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Find risky managers (those with multiple overdue invoices or stalled shipments)
    const managerRisk = await this.escalationModel.aggregate([
      { $match: { resolvedAt: { $exists: false } } },
      { $group: { _id: '$managerId', overdueCount: { $sum: 1 } } },
      { $match: { overdueCount: { $gte: 3 } } },
    ]);

    return {
      criticalOverdueInvoices: criticalOverdue,
      stalledShipments: stalledShipments,
      riskyManagers: managerRisk.length,
      totalAtRiskAmount: atRiskAmount[0]?.total || 0,
    };
  }

  /**
   * Team block
   */
  async getTeamBlock(startDate: Date, endDate: Date): Promise<OwnerDashboardResponse['team']> {
    // Get all managers (users with manager role)
    const managers = await this.userModel.find({ role: { $in: ['manager', 'senior_manager', 'team_lead', 'owner'] } }).lean();

    const teamStats = await Promise.all(
      managers.map(async (manager) => {
        const [
          deals,
          paidInvoices,
          totalInvoices,
          overdueInvoices,
          delayedShipments,
          avgPayment,
        ] = await Promise.all([
          this.dealModel.countDocuments({ managerId: manager.id, createdAt: { $gte: startDate, $lte: endDate } }),
          this.invoiceModel.aggregate([
            { $match: { managerId: manager.id, status: InvoiceStatus.PAID, paidAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ]),
          this.invoiceModel.countDocuments({ managerId: manager.id, createdAt: { $gte: startDate, $lte: endDate } }),
          this.escalationModel.countDocuments({ managerId: manager.id, resolvedAt: { $exists: false } }),
          this.alertLogModel.countDocuments({
            alertType: ShipmentAlertType.DELAYED,
            resolvedAt: { $exists: false },
          }),
          this.invoiceModel.aggregate([
            { $match: { managerId: manager.id, status: InvoiceStatus.PAID, paidAt: { $exists: true }, sentAt: { $exists: true } } },
            { $project: { delay: { $subtract: ['$paidAt', '$sentAt'] } } },
            { $group: { _id: null, avgDelay: { $avg: '$delay' } } },
          ]),
        ]);

        return {
          managerId: manager.id,
          managerName: manager.name,
          email: manager.email,
          totalDeals: deals,
          revenue: paidInvoices[0]?.total || 0,
          paidRate: totalInvoices > 0 
            ? Math.round(((paidInvoices[0]?.count || 0) / totalInvoices) * 100)
            : 0,
          overdueCount: overdueInvoices,
          shipmentDelayCount: delayedShipments,
          avgPaymentDays: avgPayment[0]?.avgDelay
            ? Math.round(avgPayment[0].avgDelay / (1000 * 60 * 60 * 24))
            : 0,
        };
      })
    );

    // Sort by revenue descending
    return teamStats.sort((a, b) => b.revenue - a.revenue);
  }
}
