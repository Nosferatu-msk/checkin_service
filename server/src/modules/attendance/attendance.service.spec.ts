import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceRaw } from './entities/attendance-raw.entity';
import { AttendanceCalculated } from './entities/attendance-calculated.entity';
import { Beacon } from '../beacons/entities/beacon.entity';
import { Zone } from '../zones/entities/zone.entity';
import { ConflictException } from '@nestjs/common';

describe('AttendanceService', () => {
  let service: AttendanceService;

  const mockAttendanceRawRepository: any = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAttendanceCalculatedRepository: any = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockBeaconRepository: any = {
    findOne: jest.fn(),
  };

  const mockZoneRepository: any = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getRepositoryToken(AttendanceRaw),
          useValue: mockAttendanceRawRepository,
        },
        {
          provide: getRepositoryToken(AttendanceCalculated),
          useValue: mockAttendanceCalculatedRepository,
        },
        {
          provide: getRepositoryToken(Beacon),
          useValue: mockBeaconRepository,
        },
        {
          provide: getRepositoryToken(Zone),
          useValue: mockZoneRepository,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitAttendance', () => {
    const validDto = {
      request_id: 'req-uuid-123',
      records: [
        {
          beacon_uuid: 'beacon-uuid-1',
          mac_address: '00:11:22:33:44:55',
          major: 1,
          minor: 100,
          scan_timestamp_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          scan_timestamp_end: new Date().toISOString(),
          median_rssi: -65,
          min_rssi: -70,
          max_rssi: -60,
          samples_count: 100,
          device_fingerprint: 'fingerprint-hash',
        },
      ],
    };

    it('should save valid attendance records', async () => {
      const mockBeacon = {
        id: 'beacon-id',
        uuid: 'beacon-uuid-1',
        mac_address: '00:11:22:33:44:55',
        is_active: true,
      };

      mockAttendanceRawRepository.findOne.mockResolvedValue(null);
      mockBeaconRepository.findOne.mockResolvedValue(mockBeacon);
      mockAttendanceRawRepository.create.mockReturnValue({});
      mockAttendanceRawRepository.save.mockResolvedValue([{}]);

      const result = await service.submitAttendance('user-uuid', validDto);

      expect(result).toHaveProperty('accepted');
      expect(result).toHaveProperty('synced_at');
      expect(result.accepted).toBe(1);
      expect(mockAttendanceRawRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate request_id', async () => {
      mockAttendanceRawRepository.findOne.mockResolvedValue({ id: 1 });

      await expect(
        service.submitAttendance('user-uuid', validDto),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.submitAttendance('user-uuid', validDto),
      ).rejects.toThrow('Запрос с таким request_id уже был обработан');
    });

    it('should skip inactive beacons', async () => {
      mockAttendanceRawRepository.findOne.mockResolvedValue(null);
      mockBeaconRepository.findOne.mockResolvedValue(null);

      const result = await service.submitAttendance('user-uuid', validDto);

      expect(result.accepted).toBe(0);
      expect(mockAttendanceRawRepository.save).not.toHaveBeenCalled();
    });

    it('should skip records with MAC address mismatch', async () => {
      const mockBeacon = {
        id: 'beacon-id',
        uuid: 'beacon-uuid-1',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        is_active: true,
      };

      mockAttendanceRawRepository.findOne.mockResolvedValue(null);
      mockBeaconRepository.findOne.mockResolvedValue(mockBeacon);

      const result = await service.submitAttendance('user-uuid', validDto);

      expect(result.accepted).toBe(0);
    });

    it('should skip records with invalid RSSI values', async () => {
      const mockBeacon = {
        id: 'beacon-id',
        uuid: 'beacon-uuid-1',
        mac_address: '00:11:22:33:44:55',
        is_active: true,
      };

      const invalidDto = {
        request_id: 'req-uuid-456',
        records: [
          {
            beacon_uuid: 'beacon-uuid-1',
            mac_address: '00:11:22:33:44:55',
            major: 1,
            minor: 100,
            scan_timestamp_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            scan_timestamp_end: new Date().toISOString(),
            median_rssi: -150,
            min_rssi: -150,
            max_rssi: -150,
            samples_count: 100,
            device_fingerprint: 'fingerprint-hash',
          },
        ],
      };

      mockAttendanceRawRepository.findOne.mockResolvedValue(null);
      mockBeaconRepository.findOne.mockResolvedValue(mockBeacon);

      const result = await service.submitAttendance('user-uuid', invalidDto);

      expect(result.accepted).toBe(0);
    });

    it('should skip records with timestamps too far in the future', async () => {
      const mockBeacon = {
        id: 'beacon-id',
        uuid: 'beacon-uuid-1',
        mac_address: '00:11:22:33:44:55',
        is_active: true,
      };

      const futureDto = {
        request_id: 'req-uuid-789',
        records: [
          {
            beacon_uuid: 'beacon-uuid-1',
            mac_address: '00:11:22:33:44:55',
            major: 1,
            minor: 100,
            scan_timestamp_start: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            scan_timestamp_end: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            median_rssi: -65,
            min_rssi: -70,
            max_rssi: -60,
            samples_count: 100,
            device_fingerprint: 'fingerprint-hash',
          },
        ],
      };

      mockAttendanceRawRepository.findOne.mockResolvedValue(null);
      mockBeaconRepository.findOne.mockResolvedValue(mockBeacon);

      const result = await service.submitAttendance('user-uuid', futureDto);

      expect(result.accepted).toBe(0);
    });

    it('should skip records with timestamps too far in the past', async () => {
      const mockBeacon = {
        id: 'beacon-id',
        uuid: 'beacon-uuid-1',
        mac_address: '00:11:22:33:44:55',
        is_active: true,
      };

      const pastDto = {
        request_id: 'req-uuid-abc',
        records: [
          {
            beacon_uuid: 'beacon-uuid-1',
            mac_address: '00:11:22:33:44:55',
            major: 1,
            minor: 100,
            scan_timestamp_start: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            scan_timestamp_end: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            median_rssi: -65,
            min_rssi: -70,
            max_rssi: -60,
            samples_count: 100,
            device_fingerprint: 'fingerprint-hash',
          },
        ],
      };

      mockAttendanceRawRepository.findOne.mockResolvedValue(null);
      mockBeaconRepository.findOne.mockResolvedValue(mockBeacon);

      const result = await service.submitAttendance('user-uuid', pastDto);

      expect(result.accepted).toBe(0);
    });

    it('should handle multiple records in one request', async () => {
      const multiDto = {
        request_id: 'req-uuid-multi',
        records: [
          {
            beacon_uuid: 'beacon-uuid-1',
            mac_address: '00:11:22:33:44:55',
            major: 1,
            minor: 100,
            scan_timestamp_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            scan_timestamp_end: new Date().toISOString(),
            median_rssi: -65,
            min_rssi: -70,
            max_rssi: -60,
            samples_count: 100,
            device_fingerprint: 'fingerprint-hash',
          },
          {
            beacon_uuid: 'beacon-uuid-2',
            mac_address: 'AA:BB:CC:DD:EE:FF',
            major: 1,
            minor: 200,
            scan_timestamp_start: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            scan_timestamp_end: new Date().toISOString(),
            median_rssi: -70,
            min_rssi: -75,
            max_rssi: -65,
            samples_count: 80,
            device_fingerprint: 'fingerprint-hash',
          },
        ],
      };

      const mockBeacon1 = {
        id: 'beacon-id-1',
        uuid: 'beacon-uuid-1',
        mac_address: '00:11:22:33:44:55',
        is_active: true,
      };

      const mockBeacon2 = {
        id: 'beacon-id-2',
        uuid: 'beacon-uuid-2',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        is_active: true,
      };

      mockAttendanceRawRepository.findOne.mockResolvedValue(null);
      mockBeaconRepository.findOne
        .mockResolvedValueOnce(mockBeacon1)
        .mockResolvedValueOnce(mockBeacon2);
      mockAttendanceRawRepository.create.mockReturnValue({});
      mockAttendanceRawRepository.save.mockResolvedValue([{}, {}]);

      const result = await service.submitAttendance('user-uuid', multiDto);

      expect(result.accepted).toBe(2);
    });
  });
});
