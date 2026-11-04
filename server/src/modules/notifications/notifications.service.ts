import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createDto);
    const saved = await this.notificationRepository.save(notification);
    
    // TODO: Отправить push-уведомление через FCM
    // TODO: Отправить WebSocket событие если пользователь онлайн
    
    this.logger.log(`Notification created for user ${createDto.user_id}: ${createDto.type}`);
    
    return saved;
  }

  async findAll(userId: string, isRead?: boolean, limit = 50) {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification')
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

  async sendToUser(userId: string, type: string, title: string, body: string) {
    return this.create({
      user_id: userId,
      type,
      title,
      body,
    });
  }

  async sendToMultipleUsers(userIds: string[], type: string, title: string, body: string) {
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type,
      title,
      body,
    }));

    const created = this.notificationRepository.create(notifications);
    const saved = await this.notificationRepository.save(created);

    this.logger.log(`Sent ${saved.length} notifications of type ${type}`);

    return { sent: saved.length };
  }
}
