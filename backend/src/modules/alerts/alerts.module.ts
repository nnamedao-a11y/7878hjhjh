/**
 * Alerts Module
 * 
 * Central notification system for BIBI Cars CRM
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertEvent, AlertEventSchema } from './alert-event.schema';
import { AlertSettings, AlertSettingsSchema } from './alert-settings.schema';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { User, UserSchema } from '../users/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlertEvent.name, schema: AlertEventSchema },
      { name: AlertSettings.name, schema: AlertSettingsSchema },
      { name: 'User', schema: UserSchema },
    ]),
    TelegramBotModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
