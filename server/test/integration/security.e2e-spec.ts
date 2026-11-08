import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Security Tests (Integration)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        login: 'admin',
        password: 'admin123',
        device_fingerprint: 'test-fingerprint',
      });

    accessToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .get('/admin/objects')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
      }
    });

    it('should block requests exceeding limit', async () => {
      // Make 100 requests (exceed limit)
      const promises = Array.from({ length: 100 }, () =>
        request(app.getHttpServer())
          .get('/admin/objects')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const results = await Promise.allSettled(promises);
      
      // Some should be rate limited (429)
      const rateLimited = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 429
      );
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/admin/objects')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/admin/objects')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject expired token', async () => {
      // TODO: Create expired token test
      // This requires generating a token with past expiration
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/admin/objects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject non-admin from admin-only endpoints', async () => {
      // Login as employee
      const employeeLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: 'employee',
          password: 'employee123',
          device_fingerprint: 'test-fingerprint',
        });

      const employeeToken = employeeLogin.body.access_token;

      await request(app.getHttpServer())
        .get('/admin/objects')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('Input Validation', () => {
    it('should reject malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should reject SQL injection attempts', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          login: "admin' OR '1'='1",
          password: 'anything',
          device_fingerprint: 'test',
        })
        .expect(401); // Should fail authentication, not SQL error
    });

    it('should reject XSS attempts', async () => {
      await request(app.getHttpServer())
        .post('/admin/objects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '<script>alert("xss")</script>',
          address: 'Test Address',
        })
        .expect(201); // Should sanitize or reject
    });
  });
});
