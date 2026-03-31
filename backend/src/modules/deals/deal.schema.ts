import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateId } from '../../shared/utils';

/**
 * Deal Schema v2.0 - Full Sales Pipeline
 * 
 * Pipeline: Quote → Lead → DEAL → Deposit → Completed
 * 
 * Зберігає:
 * - Зв'язки з quote/lead
 * - Фінансові дані (estimated vs real margin)
 * - Override tracking
 * - Status pipeline
 */

const DealStatusValues = [
  'new',              // Новий deal
  'negotiation',      // Переговори
  'waiting_deposit',  // Очікує депозит
  'deposit_paid',     // Депозит сплачено
  'purchased',        // Авто куплено на аукціоні
  'in_delivery',      // В доставці
  'completed',        // Завершено
  'cancelled'         // Скасовано
];

@Schema({ timestamps: true })
export class Deal extends Document {
  @Prop({ type: String, default: () => generateId(), unique: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  customerId?: string;

  // ============ PIPELINE LINKS ============
  @Prop({ index: true })
  leadId?: string;

  @Prop({ index: true })
  quoteId?: string;

  @Prop({ index: true })
  depositId?: string;

  @Prop({ index: true })
  vin?: string;

  // ============ MANAGER ============
  @Prop()
  assignedTo?: string;

  @Prop()
  managerId?: string;

  // ============ PRICING FROM QUOTE ============
  @Prop({ default: 'recommended', enum: ['minimum', 'recommended', 'aggressive'] })
  sourceScenario: string;

  @Prop({ type: Number, default: 0 })
  purchasePrice: number;  // Ціна покупки на аукціоні

  @Prop({ type: Number, default: 0 })
  clientPrice: number;    // Ціна для клієнта (visible total)

  @Prop({ type: Number, default: 0 })
  internalCost: number;   // Внутрішня собівартість (internal total)

  // ============ MARGIN TRACKING ============
  @Prop({ type: Number, default: 0 })
  estimatedMargin: number;  // clientPrice - internalCost (з quote)

  @Prop({ type: Number, default: 0 })
  realCost: number;         // Реальні витрати (після завершення)

  @Prop({ type: Number, default: 0 })
  realRevenue: number;      // Реальний дохід (фактично отримано)

  @Prop({ type: Number, default: 0 })
  realProfit: number;       // realRevenue - realCost

  // ============ OVERRIDE TRACKING ============
  @Prop({ default: false })
  overrideApplied: boolean;

  @Prop({ type: Number, default: 0 })
  overrideDelta: number;    // Скільки втрачено через override

  // ============ LEGACY FIELDS ============
  @Prop({ type: Number, default: 0 })
  value: number;            // = clientPrice (для сумісності)

  @Prop({ type: Number, default: 0 })
  commission: number;

  // ============ STATUS & META ============
  @Prop({ type: String, enum: DealStatusValues, default: 'new' })
  status: string;

  @Prop()
  description?: string;

  @Prop()
  deadline?: Date;

  @Prop()
  vehiclePlaceholder?: string;

  @Prop()
  vehicleTitle?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  createdBy: string;

  @Prop()
  closedAt?: Date;

  @Prop()
  notes?: string;
}

export const DealSchema = SchemaFactory.createForClass(Deal);

DealSchema.index({ customerId: 1 });
DealSchema.index({ leadId: 1 });
DealSchema.index({ quoteId: 1 });
DealSchema.index({ vin: 1 });
DealSchema.index({ status: 1 });
DealSchema.index({ assignedTo: 1 });
DealSchema.index({ managerId: 1 });
DealSchema.index({ createdAt: -1 });
