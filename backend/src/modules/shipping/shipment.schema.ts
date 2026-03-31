/**
 * Shipment Schema
 * 
 * Tracks vehicle shipping status
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ShipmentStatus {
  PENDING = 'pending',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  AT_PORT = 'at_port',
  CUSTOMS_CLEARANCE = 'customs_clearance',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Shipment extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  customerId: string;

  @Prop()
  customerName: string;

  @Prop()
  customerEmail: string;

  @Prop()
  dealId: string;

  @Prop({ required: true })
  vin: string;

  @Prop()
  vehicleTitle: string;

  // Shipping details
  @Prop()
  containerNumber: string;

  @Prop()
  bookingNumber: string;

  @Prop()
  shippingLine: string;

  @Prop()
  vesselName: string;

  // Ports
  @Prop()
  originPort: string;

  @Prop()
  destinationPort: string;

  @Prop()
  currentLocation: string;

  // Status
  @Prop({ type: String, enum: ShipmentStatus, default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

  // Dates
  @Prop()
  estimatedPickupDate: Date;

  @Prop()
  actualPickupDate: Date;

  @Prop()
  estimatedDepartureDate: Date;

  @Prop()
  actualDepartureDate: Date;

  @Prop()
  estimatedArrivalDate: Date;

  @Prop()
  actualArrivalDate: Date;

  @Prop()
  estimatedDeliveryDate: Date;

  @Prop()
  actualDeliveryDate: Date;

  // Events timeline
  @Prop({ type: [Object], default: [] })
  events: Array<{
    status: string;
    location: string;
    description: string;
    timestamp: Date;
  }>;

  // Documents
  @Prop({ type: [Object], default: [] })
  documents: Array<{
    type: string;
    name: string;
    url: string;
    uploadedAt: Date;
  }>;

  // Metadata
  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  notes: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);

// Indexes
ShipmentSchema.index({ id: 1 }, { unique: true });
ShipmentSchema.index({ customerId: 1 });
ShipmentSchema.index({ dealId: 1 });
ShipmentSchema.index({ vin: 1 });
ShipmentSchema.index({ containerNumber: 1 });
ShipmentSchema.index({ status: 1 });
ShipmentSchema.index({ createdAt: -1 });
