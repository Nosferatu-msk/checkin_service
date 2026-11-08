import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Attendance Flow (Integration)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login first
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

  describe('POST /mobile/attendance', () => {
    it('should submit attendance data', async () => {
      const attendanceData = {
        request_id: 'test-req-123',
        records: [
          {
            beacon_uuid: '123e4567-e89b-12d3-a456-426614174000',
            mac_address: '00:11:22:33:44:55',
            scan_timestamp_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            scan_timestamp_end: new Date().toISOString(),
            median_rssi: -65,
            min_rssi: -70,
            max_rssi: -60,
            samples_count: 100,
            device_fingerprint: 'test-fingerprint',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/mobile/attendance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(attendanceData)
        .expect(200);

      expect(response.body).toHaveProperty('accepted');
      expect(response.body).toHaveProperty('synced_at');
      expect(response.body.accepted).toBe(1);
    });

    it('should reject duplicate request_id', async () => {
      const attendanceData = {
        request_id: 'duplicate-req-123',
        records: [
          {
            beacon_uuid: '123e4567-e89b-12d3-a456-426614174000',
            mac_address: '00:11:22:33:44:55',
            scan_timestamp_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            scan_timestamp_end: new Date().toISOString(),
            median_rssi: -65,
            min_rssi: -70,
            max_rssi: -60,
            samples_count: 100,
            device_fingerprint: 'test-fingerprint',
          },
        ],
      };

      // First request
      await request(app.getHttpServer())
        .post('/mobile/attendance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(attendanceData)
        .expect(200);

      // Duplicate request
      await request(app.getHttpServer())
        .post('/mobile/attendance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(attendanceData)
        .expect(409);
    });

    it('should skip inactive beacons', async () => {
      const attendanceData = {
        request_id: 'test-req-inactive',
        records: [
          {
            beacon_uuid: 'inactive-beacon-uuid',
            mac_address: '00:11:22:33:44:55',
            scan_timestamp_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            scan_timestamp_end: new Date().toISOString(),
            median_rssi: -65,
            min_rssi: -70,
            max_rssi: -60,
            samples_count: 100,
            device_fingerprint: 'test-fingerprint',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/mobile/attendance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(attendanceData)
        .expect(200);

      expect(response.body.accepted).toBe(0);
    });

    it('should validate RSSI values', async () => {
      const attendanceData = {
        request_id: 'test-req-rssi',
        records: [
          {
            beacon_uuid: '123e4567-e89b-12d3-a456-426614174000',
            mac_address: '00:11:22:33:44:55',
            scan_timestamp_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            scan_timestamp_end: new Date().toISOString(),
            median_rssi: -150, // Invalid RSSI
            min_rssi: -150,
            max_rssi: -150,
            samples_count: 100,
            device_fingerprint: 'test-fingerprint',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/mobile/attendance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(attendanceData)
        .expect(200);

      expect(response.body.accepted).toBe(0);
    });
  });

  describe('GET /admin/attendance', () => {
    it('should get all attendance records (admin only)', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/attendance')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by date range', async () => {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(`/admin/attendance?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });
});
