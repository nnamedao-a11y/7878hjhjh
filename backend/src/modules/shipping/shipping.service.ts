/**
 * Shipping Service
 * 
 * Tracks vehicle shipping from pickup to delivery
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipment, ShipmentStatus } from './shipment.schema';
import { generateId, toObjectResponse } from '../../shared/utils';

export interface CreateShipmentDto {
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  dealId?: string;
  vin: string;
  vehicleTitle?: string;
  containerNumber?: string;
  bookingNumber?: string;
  shippingLine?: string;
  originPort?: string;
  destinationPort?: string;
  estimatedDepartureDate?: Date;
  estimatedArrivalDate?: Date;
  estimatedDeliveryDate?: Date;
}

export interface UpdateShipmentDto {
  status?: ShipmentStatus;
  containerNumber?: string;
  vesselName?: string;
  currentLocation?: string;
  estimatedArrivalDate?: Date;
  estimatedDeliveryDate?: Date;
  notes?: string;
}

export interface AddEventDto {
  status: string;
  location: string;
  description: string;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
  ) {}

  // === CREATE SHIPMENT ===
  
  async createShipment(dto: CreateShipmentDto): Promise<Shipment> {
    const shipment = new this.shipmentModel({
      id: generateId(),
      ...dto,
      status: ShipmentStatus.PENDING,
      events: [{
        status: 'created',
        location: dto.originPort || 'USA',
        description: 'Shipment created',
        timestamp: new Date(),
      }],
    });

    await shipment.save();
    this.logger.log(`Shipment created: ${shipment.id} for VIN ${dto.vin}`);

    return shipment;
  }

  // === UPDATE SHIPMENT ===
  
  async updateShipment(shipmentId: string, dto: UpdateShipmentDto): Promise<Shipment> {
    const shipment = await this.shipmentModel.findOne({ id: shipmentId });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    // Update fields
    Object.assign(shipment, dto);

    // If status changed, add event
    if (dto.status && dto.status !== shipment.status) {
      shipment.events.push({
        status: dto.status,
        location: dto.currentLocation || shipment.currentLocation || '',
        description: this.getStatusDescription(dto.status),
        timestamp: new Date(),
      });

      // Update actual dates based on status
      switch (dto.status) {
        case ShipmentStatus.PICKED_UP:
          shipment.actualPickupDate = new Date();
          break;
        case ShipmentStatus.IN_TRANSIT:
          shipment.actualDepartureDate = new Date();
          break;
        case ShipmentStatus.AT_PORT:
          shipment.actualArrivalDate = new Date();
          break;
        case ShipmentStatus.DELIVERED:
          shipment.actualDeliveryDate = new Date();
          break;
      }
    }

    await shipment.save();
    this.logger.log(`Shipment updated: ${shipment.id} - ${shipment.status}`);

    return shipment;
  }

  // === ADD EVENT ===
  
  async addEvent(shipmentId: string, dto: AddEventDto): Promise<Shipment> {
    const shipment = await this.shipmentModel.findOne({ id: shipmentId });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    shipment.events.push({
      ...dto,
      timestamp: new Date(),
    });
    shipment.currentLocation = dto.location;

    await shipment.save();
    this.logger.log(`Event added to shipment ${shipment.id}: ${dto.status}`);

    return shipment;
  }

  // === ADD DOCUMENT ===
  
  async addDocument(shipmentId: string, doc: { type: string; name: string; url: string }): Promise<Shipment> {
    const shipment = await this.shipmentModel.findOneAndUpdate(
      { id: shipmentId },
      {
        $push: {
          documents: { ...doc, uploadedAt: new Date() },
        },
      },
      { new: true }
    );

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }

  // === GET SHIPMENT ===
  
  async getShipment(shipmentId: string): Promise<any> {
    const shipment = await this.shipmentModel.findOne({ id: shipmentId }).lean();
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return toObjectResponse(shipment);
  }

  // === GET BY VIN ===
  
  async getByVin(vin: string): Promise<any> {
    const shipment = await this.shipmentModel.findOne({ vin }).lean();
    return shipment ? toObjectResponse(shipment) : null;
  }

  // === GET USER SHIPMENTS ===
  
  async getUserShipments(customerId: string): Promise<any[]> {
    const shipments = await this.shipmentModel.find({ customerId })
      .sort({ createdAt: -1 })
      .lean();
    
    return shipments.map(s => toObjectResponse(s));
  }

  // === GET DEAL SHIPMENT ===
  
  async getDealShipment(dealId: string): Promise<any> {
    const shipment = await this.shipmentModel.findOne({ dealId }).lean();
    return shipment ? toObjectResponse(shipment) : null;
  }

  // === GET ALL ACTIVE SHIPMENTS (ADMIN) ===
  
  async getActiveShipments(): Promise<any[]> {
    const shipments = await this.shipmentModel.find({
      status: { $nin: [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED] },
    })
      .sort({ estimatedArrivalDate: 1 })
      .lean();
    
    return shipments.map(s => toObjectResponse(s));
  }

  // === GET ANALYTICS ===
  
  async getAnalytics(periodDays: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [total, byStatus, avgDeliveryTime] = await Promise.all([
      this.shipmentModel.countDocuments({ createdAt: { $gte: startDate } }),
      this.shipmentModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.shipmentModel.aggregate([
        {
          $match: {
            status: ShipmentStatus.DELIVERED,
            actualDeliveryDate: { $exists: true },
            actualPickupDate: { $exists: true },
          },
        },
        {
          $project: {
            deliveryTime: {
              $subtract: ['$actualDeliveryDate', '$actualPickupDate'],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$deliveryTime' },
          },
        },
      ]),
    ]);

    const avgDays = avgDeliveryTime[0]?.avgTime
      ? Math.round(avgDeliveryTime[0].avgTime / (1000 * 60 * 60 * 24))
      : 0;

    return {
      total,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      inTransit: byStatus.find(s => s._id === ShipmentStatus.IN_TRANSIT)?.count || 0,
      delivered: byStatus.find(s => s._id === ShipmentStatus.DELIVERED)?.count || 0,
      avgDeliveryDays: avgDays,
      periodDays,
    };
  }

  private getStatusDescription(status: ShipmentStatus): string {
    const descriptions = {
      [ShipmentStatus.PENDING]: 'Shipment pending pickup',
      [ShipmentStatus.PICKED_UP]: 'Vehicle picked up from auction',
      [ShipmentStatus.IN_TRANSIT]: 'Vehicle in transit to port',
      [ShipmentStatus.AT_PORT]: 'Vehicle arrived at destination port',
      [ShipmentStatus.CUSTOMS_CLEARANCE]: 'Vehicle in customs clearance',
      [ShipmentStatus.DELIVERED]: 'Vehicle delivered to customer',
      [ShipmentStatus.CANCELLED]: 'Shipment cancelled',
    };
    return descriptions[status] || 'Status updated';
  }
}
