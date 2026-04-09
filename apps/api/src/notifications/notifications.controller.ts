import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type UserPayload = { id: string };

@Controller('notifications')
@UseGuards(AuthGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.notifications.findAll(user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: UserPayload) {
    return this.notifications.unreadCount(user.id).then((count) => ({ count }));
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.notifications.markRead(id, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: UserPayload) {
    return this.notifications.markAllRead(user.id);
  }
}
