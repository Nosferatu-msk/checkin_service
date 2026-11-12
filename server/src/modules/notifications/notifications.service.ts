import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/notification.dto';
import { User } from '../users/entities/user.entity';
import { DevicePushToken } from '../attendance/entities/device-push-token.entity';
import { FcmService } from './fcm.service';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DevicePushToken)
    private pushTokenRepository: Repository<DevicePushToken>,
    private fcmService: FcmService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createDto);
    const saved = await this.notificationRepository.save(notification);

    this.logger.log(
      `Notification created for user ${createDto.user_id}: ${createDto.type}`,
    );

    // Отправка push-уведомления и WebSocket события (не блокирует ответ)
    this.deliverNotification(
      createDto.user_id,
      createDto.type,
      createDto.title,
      createDto.body,
    ).catch((err) =>
      this.logger.error(`Delivery failed: ${err.message}`, err.stack),
    );

    return saved;
  }

  async findAll(userId: string, isRead?: boolean, limit = 50) {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId });

    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.is_read = :isRead', { isRead });
    }

    const notifications = await queryBuilder
      .orderBy('notification.created_at', 'DESC')
      .limit(limit)
      .getMany();

    return { data: notifications };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Уведомление не найдено');
    }

    notification.is_read = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true },
    );

    return { updated: result.affected || 0 };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { user_id: userId, is_read: false },
    });
  }

  async sendToUser(
    userId: string,
    type: string,
    title: string,
    body: string,
  ) {
    const saved = await this.create({
      user_id: userId,
      type,
      title,
      body,
    });

    return saved;
  }

  async sendToMultipleUsers(
    userIds: string[],
    type: string,
    title: string,
    body: string,
  ) {
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type,
      title,
      body,
    }));

    const created = this.notificationRepository.create(notifications);
    const saved = await this.notificationRepository.save(created);

    this.logger.log(`Sent ${saved.length} notifications of type ${type}`);

    // Доставка уведомлений всем пользователям (не блокирует ответ)
    for (const userId of userIds) {
      this.deliverNotification(userId, type, title, body).catch((err) =>
        this.logger.error(
          `Delivery failed for user ${userId}: ${err.message}`,
          err.stack,
        ),
      );
    }

    return { sent: saved.length };
  }

  async sendToAdmins(type: string, title: string, body: string) {
    const admins = await this.userRepository.find({
      where: [{ role: 'admin' }, { role: 'curator' }],
      select: { id: true },
    });

    if (admins.length === 0) {
      this.logger.warn('No admin/curator users found for notification');
      return { sent: 0 };
    }

    const adminIds = admins.map((a) => a.id);
    return this.sendToMultipleUsers(adminIds, type, title, body);
  }

  /**
   * Доставка уведомления: FCM push + WebSocket.
   * Ошибки логируются, но не пробрасываются наружу.
   */
  private async deliverNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
  ): Promise<void> {
    // 1. WebSocket — мгновенная доставка, если пользователь онлайн
    try {
      this.eventsGateway.sendNotification(userId, {
        type,
        title,
        body,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn(
        `WebSocket delivery failed for user ${userId}: ${err.message}`,
      );
    }

    // 2. FCM push — для оффлайн-пользователей и мобильных устройств
    try {
      const tokens = await this.pushTokenRepository.find({
        where: { user_id: userId, is_active: true },
      });

      if (tokens.length > 0) {
        await this.fcmService.sendMulticast(
          tokens.map((t) => t.push_token),
          {
            title,
            body,
            data: { type },
          },
        );
      }
    } catch (err) {
      this.logger.warn(
        `FCM delivery failed for user ${userId}: ${err.message}`,
      );
    }
  }
}
