/**
 * BIBI Cars Telegram Bot Module
 * 
 * Full-featured Telegram bot for customer communication:
 * - Deep link account linking
 * - Multi-language support (BG/EN)
 * - Order tracking
 * - Saved cars
 * - Notifications
 * - Manager contact
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotController } from './telegram-bot.controller';
import { TelegramLinkService } from './telegram-link.service';
import { TelegramRouterService } from './telegram-router.service';

import { Customer, CustomerSchema } from '../customers/customer.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { CustomerSavedListing, CustomerSavedListingSchema } from '../customer-auth/schemas/customer-saved-listing.schema';

import { CustomerCabinetModule } from '../customer-cabinet/customer-cabinet.module';

@Module({
  imports: [
    CustomerCabinetModule,
    MongooseModule.forFeature([
      { name: 'Customer', schema: CustomerSchema },
      { name: 'Notification', schema: NotificationSchema },
      { name: 'CustomerSavedListing', schema: CustomerSavedListingSchema },
    ]),
  ],
  controllers: [TelegramBotController],
  providers: [
    TelegramBotService,
    TelegramLinkService,
    TelegramRouterService,
  ],
  exports: [TelegramBotService, TelegramLinkService],
})
export class TelegramBotModule {}
