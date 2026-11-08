import { describe, it, expect, beforeAll } from '@jest/globals';
import { loadTestConfig } from './load-test-config';

/**
 * Load Testing Configuration
 * 
 * To run load tests:
 * 1. Install artillery: npm install -g artillery
 * 2. Run: artillery run test/integration/load-test.yml
 */

describe('Load Test Configuration', () => {
  it('should have valid load test config', () => {
    const config = loadTestConfig;
    
    expect(config).toBeDefined();
    expect(config.config.target).toBeDefined();
    expect(config.scenarios).toBeDefined();
    expect(Array.isArray(config.scenarios)).toBe(true);
  });
});

export const loadTestConfig = {
  config: {
    target: 'http://localhost:3000',
    phases: [
      {
        duration: 60,
        arrivalRate: 10,
        name: 'Warm up',
      },
      {
        duration: 120,
        arrivalRate: 50,
        name: 'Load test',
      },
      {
        duration: 60,
        arrivalRate: 100,
        name: 'Stress test',
      },
    ],
    defaults: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  },
  scenarios: [
    {
      name: 'Login flow',
      flow: [
        {
          post: {
            url: '/auth/login',
            json: {
              login: 'admin',
              password: 'admin123',
              device_fingerprint: 'load-test-fingerprint',
            },
            capture: [
              {
                json: '$.access_token',
                as: 'accessToken',
              },
            ],
          },
        },
        {
          get: {
            url: '/admin/objects',
            headers: {
              Authorization: 'Bearer {{ accessToken }}',
            },
          },
        },
      ],
    },
    {
      name: 'Submit attendance',
      flow: [
        {
          post: {
            url: '/auth/login',
            json: {
              login: 'employee',
              password: 'employee123',
              device_fingerprint: 'load-test-fingerprint',
            },
            capture: [
              {
                json: '$.access_token',
                as: 'accessToken',
              },
            ],
          },
        },
        {
          post: {
            url: '/mobile/attendance',
            headers: {
              Authorization: 'Bearer {{ accessToken }}',
            },
            json: {
              request_id: 'load-test-{{ $randomString }}',
              records: [
                {
                  beacon_uuid: '123e4567-e89b-12d3-a456-426614174000',
                  mac_address: '00:11:22:33:44:55',
                  scan_timestamp_start: '{{ $timestamp }}',
                  scan_timestamp_end: '{{ $timestamp }}',
                  median_rssi: -65,
                  min_rssi: -70,
                  max_rssi: -60,
                  samples_count: 100,
                  device_fingerprint: 'load-test-fingerprint',
                },
              ],
            },
          },
        },
      ],
    },
  ],
};
