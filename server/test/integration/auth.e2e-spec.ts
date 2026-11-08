import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';

describe('Authentication Flow (Integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = app.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'admin',
          password: 'admin123',
          device_fingerprint: 'test-fingerprint',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.login).toBe('admin');

      accessToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('should fail with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'admin',
          password: 'wrongpassword',
          device_fingerprint: 'test-fingerprint',
        })
        .expect(401);
    });

    it('should fail with missing fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'admin',
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('expires_in');
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(200);

      // Token should be blacklisted now
      const isBlacklisted = await authService['redisService'].isBlacklisted(refreshToken);
      expect(isBlacklisted).toBe(true);
    });

    it('should fail to use blacklisted token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);
    });
  });
});
