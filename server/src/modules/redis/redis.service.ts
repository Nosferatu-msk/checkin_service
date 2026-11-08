import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      lazyConnect: true,
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.client.connect().catch((error) => {
      console.error('Failed to connect to Redis:', error);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  // Token Blacklist methods
  async addToBlacklist(token: string, expiresInSeconds: number): Promise<void> {
    await this.client.setex(`blacklist:${token}`, expiresInSeconds, '1');
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:${token}`);
    return result !== null;
  }

  async removeFromBlacklist(token: string): Promise<void> {
    await this.client.del(`blacklist:${token}`);
  }

  // Device fingerprint methods
  async setDeviceFingerprint(
    userId: string,
    fingerprint: string,
    ttlSeconds: number = 2592000, // 30 days
  ): Promise<void> {
    await this.client.setex(`device:${userId}`, ttlSeconds, fingerprint);
  }

  async getDeviceFingerprint(userId: string): Promise<string | null> {
    return this.client.get(`device:${userId}`);
  }

  async deleteDeviceFingerprint(userId: string): Promise<void> {
    await this.client.del(`device:${userId}`);
  }

  // Session management
  async setSession(
    sessionId: string,
    data: any,
    ttlSeconds: number = 86400, // 24 hours
  ): Promise<void> {
    await this.client.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  // Rate limiting (advanced)
  async incrementRateLimit(
    key: string,
    ttlSeconds: number = 60,
  ): Promise<number> {
    const pipeline = this.client.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const results = await pipeline.exec();
    return results?.[0]?.[1] as number;
  }

  async getRateLimitCount(key: string): Promise<number> {
    const count = await this.client.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  // Cache methods
  async setCache(
    key: string,
    value: any,
    ttlSeconds: number = 3600, // 1 hour
  ): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async getCache(key: string): Promise<any> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clearCachePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
