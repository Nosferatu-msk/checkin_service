import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { MarkAsReadDto } from './dto/notification.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AuthenticatedRequest } from '../../common/types/request.types';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Получение списка уведомлений' })
  @ApiQuery({ name: 'is_read', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Список уведомлений' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('is_read') isRead?: boolean,
    @Query('limit') limit = 50,
  ) {
    return this.notificationsService.findAll(req.user.id, isRead, Number(limit));
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Получение количества непрочитанных уведомлений' })
  @ApiResponse({ status: 200, description: 'Количество непрочитанных' })
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { data: { count } };
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Пометить уведомление как прочитанное' })
  @ApiResponse({ status: 200, description: 'Уведомление помечено' })
  @ApiResponse({ status: 404, description: 'Уведомление не найдено' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const notification = await this.notificationsService.markAsRead(id, req.user.id);
    return { data: notification };
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Пометить все уведомления как прочитанные' })
  @ApiResponse({ status: 200, description: 'Все уведомления помечены' })
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    const result = await this.notificationsService.markAllAsRead(req.user.id);
    return { data: result };
  }
}
