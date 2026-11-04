import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectQueue('health-check') private readonly healthQueue: Queue,
  ) {}

  async check() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      queue: await this.checkQueue(),
    };

    const status = Object.values(checks).every((check) => check === 'ok')
      ? 'healthy'
      : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.connection.query('SELECT 1');
      return 'connected';
    } catch (error) {
      return 'disconnected';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      const client = this.healthQueue.clients[0];
      await client.ping();
      return 'connected';
    } catch (error) {
      return 'disconnected';
    }
  }

  private async checkQueue(): Promise<string> {
    try {
      const waiting = await this.healthQueue.getWaitingCount();
      const active = await this.healthQueue.getActiveCount();
      return `active (waiting: ${waiting}, active: ${active})`;
    } catch (error) {
      return 'inactive';
    }
  }
}
