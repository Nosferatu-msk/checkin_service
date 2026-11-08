import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Objects CRUD (Integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let objectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as admin
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

  describe('POST /admin/objects', () => {
    it('should create a new object', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/objects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Object',
          address: 'Test Address 123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Object');
      expect(response.body.address).toBe('Test Address 123');

      objectId = response.body.id;
    });

    it('should fail without required fields', async () => {
      await request(app.getHttpServer())
        .post('/admin/objects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /admin/objects', () => {
    it('should get all objects', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/objects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get object by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/objects/${objectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(objectId);
      expect(response.body.name).toBe('Test Object');
    });
  });

  describe('PUT /admin/objects/:id', () => {
    it('should update object', async () => {
      const response = await request(app.getHttpServer())
        .put(`/admin/objects/${objectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Object Name',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Object Name');
    });
  });

  describe('DELETE /admin/objects/:id', () => {
    it('should delete object', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/objects/${objectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/admin/objects/${objectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
