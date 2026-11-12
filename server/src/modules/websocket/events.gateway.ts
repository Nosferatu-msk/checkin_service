import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

interface ConnectedUser {
  userId: string;
  role: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://app.checkin-service.com', 'https://admin.checkin-service.com']
      : ['http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedUsers: Map<string, ConnectedUser> = new Map(); // socketId -> { userId, role }

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Аутентификация через токен в query параметре
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Connection rejected: no token provided`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token as string);
      const userId = payload.sub;
      const role = payload.role;

      this.connectedUsers.set(client.id, { userId, role });
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (user: ${userId}, role: ${role})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userData = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);

    this.logger.log(`Client disconnected: ${client.id} (user: ${userData?.userId})`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channels: string[] },
  ) {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) {
      this.logger.warn(`Subscribe rejected: user not authenticated`);
      return;
    }

    data.channels.forEach((channel) => {
      // Проверка прав на подписку
      if (channel.startsWith('user:')) {
        // Пользователь может подписаться только на свой канал
        if (channel !== `user:${userData.userId}`) {
          this.logger.warn(
            `User ${userData.userId} attempted to subscribe to another user's channel: ${channel}`
          );
          return;
        }
      }

      // Admin-only channels
      const adminOnlyChannels = ['fraud_alerts', 'sla_violations', 'admin_notifications'];
      if (adminOnlyChannels.includes(channel)) {
        if (userData.role !== 'admin' && userData.role !== 'curator') {
          this.logger.warn(
            `User ${userData.userId} (${userData.role}) attempted to subscribe to admin channel: ${channel}`
          );
          return;
        }
      }

      client.join(channel);
    });

    this.logger.log(`Client ${client.id} subscribed to: ${data.channels.join(', ')}`);

    client.emit('subscribed', { channels: data.channels });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channels: string[] },
  ) {
    data.channels.forEach((channel) => {
      client.leave(channel);
    });

    this.logger.log(`Client ${client.id} unsubscribed from: ${data.channels.join(', ')}`);

    client.emit('unsubscribed', { channels: data.channels });
  }

  // Методы для отправки событий клиентам

  sendFraudAlert(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('fraud_alert', data);
    this.server.to('fraud_alerts').emit('fraud_alert', data);
  }

  sendSlaViolation(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('sla_violation', data);
    this.server.to('sla_violations').emit('sla_violation', data);
  }

  sendBeaconStatus(data: any) {
    this.server.to('beacon_status').emit('beacon_status', data);
  }

  sendEmployeePresence(data: any) {
    this.server.to('employee_presence').emit('employee_presence', data);
  }

  sendNotification(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('notification', data);
  }

  isUserOnline(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).some(u => u.userId === userId);
  }
}
