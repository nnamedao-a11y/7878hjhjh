import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Services
import { NotificationsService } from './notifications.service';
import { SmartNotificationService } from './smart-notification.service';
import { SmartIntentService } from './smart-intent.service';
import { TelegramService } from './telegram.service';
import { CooldownService } from './cooldown.service';
import { NotificationCron } from './notification.cron';

// Controllers
import { NotificationsController } from './notifications.controller';
import { NotificationController } from './notification.controller';

// Schemas
import { AdminNotification, AdminNotificationSchema } from './notification.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { TelegramLink, TelegramLinkSchema } from './schemas/telegram-link.schema';

// External schemas for intent scoring
import { CustomerSavedListing, CustomerSavedListingSchema } from '../customer-auth/schemas/customer-saved-listing.schema';
import { CustomerRecentlyViewed, CustomerRecentlyViewedSchema } from '../customer-auth/schemas/customer-recently-viewed.schema';
import { Lead, LeadSchema } from '../leads/lead.schema';
import { Vehicle, VehicleSchema } from '../ingestion/schemas/vehicle.schema';
import { Deal, DealSchema } from '../deals/deal.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Notification schemas
      { name: AdminNotification.name, schema: AdminNotificationSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: TelegramLink.name, schema: TelegramLinkSchema },
      
      // External schemas for intent scoring and cron jobs
      { name: 'CustomerSavedListing', schema: CustomerSavedListingSchema },
      { name: 'CustomerRecentlyViewed', schema: CustomerRecentlyViewedSchema },
      { name: 'Lead', schema: LeadSchema },
      { name: 'VehicleListing', schema: VehicleSchema },
      { name: 'Deal', schema: DealSchema },
    ]),
  ],
  controllers: [NotificationsController, NotificationController],
  providers: [
    NotificationsService,
    SmartNotificationService,
    SmartIntentService,
    TelegramService,
    CooldownService,
    NotificationCron,
  ],
  exports: [
    NotificationsService,
    SmartNotificationService,
    TelegramService,
    CooldownService,
  ],
})
export class NotificationsModule {}
