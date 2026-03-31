import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationChannel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  PUSH = 'push',
}

export enum NotificationType {
  // User Notifications
  AUCTION_SOON = 'auction_soon',
  PRICE_DROP = 'price_drop',
  LISTING_SOLD = 'listing_sold',
  RECOMMENDATION = 'recommendation',
  SAVED_CAR_UPDATE = 'saved_car_update',
  
  // CRM Notifications
  NEW_LEAD = 'new_lead',
  DEAL_STATUS_CHANGED = 'deal_status_changed',
  WAITING_DEPOSIT_TIMEOUT = 'waiting_deposit_timeout',
  DEAL_COMPLETED = 'deal_completed',
  
  // System
  WELCOME = 'welcome',
  ACCOUNT_LINKED = 'account_linked',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Notification Schema
 * 
 * Stores all notifications with delivery status
 */

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ index: true })
  customerId?: string;

  @Prop({ index: true })
  managerId?: string;

  @Prop({ required: true, enum: NotificationType, index: true })
  type: NotificationType;

  @Prop({ required: true, enum: NotificationChannel })
  channel: NotificationChannel;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: NotificationStatus, default: NotificationStatus.PENDING, index: true })
  status: NotificationStatus;

  @Prop()
  sentAt?: Date;

  @Prop()
  error?: string;

  @Prop({ type: Object })
  meta?: {
    listingId?: string;
    listingTitle?: string;
    dealId?: string;
    leadId?: string;
    oldPrice?: number;
    newPrice?: number;
    auctionDate?: Date;
    link?: string;
  };

  @Prop({ default: 0 })
  priority: number;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: 1 });
NotificationSchema.index({ customerId: 1, isRead: 1 });
