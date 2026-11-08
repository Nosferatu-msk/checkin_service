import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BeaconsService } from './beacons.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Beacon } from './entities/beacon.entity';

describe('BeaconsService', () => {
  let service: BeaconsService;

  const mockBeaconRepository: any = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    findBy: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: (jest.fn() as any).mockResolvedValue(0),
      getMany: (jest.fn() as any).mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BeaconsService,
        {
          provide: getRepositoryToken(Beacon),
          useValue: mockBeaconRepository,
        },
      ],
    }).compile();

    service = module.get<BeaconsService>(BeaconsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new beacon', async () => {
      const createDto = {
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        major: 1,
        minor: 100,
        zone_id: 'zone-uuid',
      };

      const mockBeacon = {
        id: 'uuid',
        ...createDto,
        is_active: true,
        created_at: new Date(),
      };

      mockBeaconRepository.findOne.mockResolvedValue(null);
      mockBeaconRepository.create.mockReturnValue(mockBeacon);
      mockBeaconRepository.save.mockResolvedValue(mockBeacon);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.uuid).toBe(createDto.uuid);
    });

    it('should throw ConflictException if beacon UUID already exists', async () => {
      const createDto = {
        uuid: 'existing-uuid',
        major: 1,
        minor: 100,
        zone_id: 'zone-uuid',
      };

      mockBeaconRepository.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(service.create(createDto)).rejects.toThrow(
        'Маяк с таким UUID уже существует',
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a beacon', async () => {
      const mockBeacon = {
        id: 'uuid',
        is_active: true,
      };

      mockBeaconRepository.findOne.mockResolvedValue(mockBeacon);
      mockBeaconRepository.save.mockResolvedValue({ ...mockBeacon, is_active: false });

      const result = await service.deactivate('uuid');

      expect(result.is_active).toBe(false);
    });
  });
});
