import { Controller, Get, Put, Post, Param, UseGuards, Request, Query, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationType } from '../../shared/enums';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findMy(@Request() req, @Query('limit') limit?: string) {
    const user = req.user;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.notificationsService.findForUser(user.id, user.role, limitNum);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const user = req.user;
    return { count: await this.notificationsService.getUnreadCount(user.id, user.role) };
  }

  @Get('stats')
  async getStats(@Request() req) {
    const user = req.user;
    return this.notificationsService.getNotificationStats(user.id, user.role);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Put('read-all')
  async markAllAsRead(@Request() req) {
    const user = req.user;
    await this.notificationsService.markAllAsRead(user.id, user.role);
    return { success: true };
  }

  /**
   * Seed test notifications (for demo/development)
   */
  @Post('seed')
  async seedTestNotifications(@Request() req) {
    const user = req.user;
    if (user.role !== 'master_admin') {
      return { error: 'Only master_admin can seed notifications' };
    }

    const testNotifications = [
      {
        type: NotificationType.NEW_LEAD,
        title: 'Новий лід з сайту',
        message: 'Клієнт Олександр Петренко залишив заявку на BMW X5',
        entityType: 'lead',
        priority: 'high' as const,
        targetRoles: ['master_admin', 'admin', 'manager'],
      },
      {
        type: NotificationType.DEAL_CREATED,
        title: 'Створено нову угоду',
        message: 'Угода #1234 на суму $45,000',
        entityType: 'deal',
        priority: 'medium' as const,
        targetRoles: ['master_admin', 'admin'],
      },
      {
        type: NotificationType.DEPOSIT_PENDING,
        title: 'Очікується підтвердження депозиту',
        message: 'Депозит $5,000 від клієнта Марії Іваненко',
        entityType: 'deposit',
        priority: 'urgent' as const,
        targetRoles: ['master_admin', 'admin', 'finance'],
      },
      {
        type: NotificationType.DOCUMENT_PENDING_VERIFICATION,
        title: 'Документ потребує верифікації',
        message: 'Договір купівлі-продажу завантажено клієнтом',
        entityType: 'document',
        priority: 'high' as const,
        targetRoles: ['master_admin', 'admin'],
      },
      {
        type: NotificationType.LEAD_SLA_WARNING,
        title: 'SLA попередження: лід без відповіді',
        message: 'Лід #567 очікує на callback більше 2 годин',
        entityType: 'lead',
        priority: 'urgent' as const,
        targetRoles: ['master_admin', 'admin', 'manager'],
      },
      {
        type: NotificationType.CUSTOMER_REGISTERED,
        title: 'Новий клієнт зареєструвався',
        message: 'Ігор Коваленко створив акаунт через Google',
        entityType: 'customer',
        priority: 'low' as const,
        targetRoles: ['master_admin'],
      },
      {
        type: NotificationType.DEAL_COMPLETED,
        title: 'Угоду успішно завершено!',
        message: 'Угода #1198 на Mercedes-Benz S-Class закрита',
        entityType: 'deal',
        priority: 'medium' as const,
        targetRoles: ['master_admin', 'admin'],
      },
      {
        type: NotificationType.PARSER_COMPLETED,
        title: 'Парсинг завершено',
        message: 'Copart: додано 156 нових авто до бази',
        entityType: 'parser',
        priority: 'low' as const,
        targetRoles: ['master_admin'],
      },
    ];

    const created: any[] = [];
    for (const notif of testNotifications) {
      const result = await this.notificationsService.create(notif);
      created.push(result);
    }

    return { 
      success: true, 
      message: `Created ${created.length} test notifications`,
      count: created.length 
    };
  }
}
