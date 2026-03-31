/**
 * Invoice Schema
 * 
 * Stores invoices for each step in the deal flow
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
}

export enum InvoiceType {
  DEPOSIT = 'deposit',
  CAR_PAYMENT = 'car_payment',
  SHIPPING = 'shipping',
  CUSTOMS = 'customs',
  SERVICE_FEE = 'service_fee',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Invoice extends Document {
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

  @Prop()
  leadId: string;

  @Prop({ type: String, enum: InvoiceType })
  type: InvoiceType;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'usd' })
  currency: string;

  @Prop()
  description: string;

  @Prop({ type: String, enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  // Stripe data
  @Prop()
  stripeSessionId: string;

  @Prop()
  stripePaymentIntentId: string;

  @Prop()
  stripeCheckoutUrl: string;

  // Metadata
  @Prop({ type: Object })
  metadata: Record<string, any>;

  // Dates
  @Prop()
  paidAt: Date;

  @Prop()
  dueDate: Date;

  @Prop()
  expiresAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Indexes
InvoiceSchema.index({ id: 1 }, { unique: true });
InvoiceSchema.index({ customerId: 1 });
InvoiceSchema.index({ dealId: 1 });
InvoiceSchema.index({ stripeSessionId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ createdAt: -1 });
