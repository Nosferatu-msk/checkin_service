import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FraudService } from './fraud.service';
import { FraudLog } from './entities/fraud-log.entity';
import { NotFoundException } from '@nestjs/common';

describe('FraudService', () => {
  let service: FraudService;

  const mockFraudLogRepository: any = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: (jest.fn() as any).mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: (jest.fn() as any).mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudService,
        {
          provide: getRepositoryToken(FraudLog),
          useValue: mockFraudLogRepository,
        },
      ],
    }).compile();

    service = module.get<FraudService>(FraudService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a fraud log', async () => {
      const createDto = {
        fraud_type: 'mock_location',
        severity: 'warning' as const,
        user_id: 'user-uuid',
        details: { reason: 'GPS spoofing detected' },
      };

      const mockFraudLog = {
        id: 1,
        ...createDto,
        is_reviewed: false,
        created_at: new Date(),
      };

      mockFraudLogRepository.create.mockReturnValue(mockFraudLog);
      mockFraudLogRepository.save.mockResolvedValue(mockFraudLog);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.fraud_type).toBe(createDto.fraud_type);
      expect(result.is_reviewed).toBe(false);
    });

    it('should handle critical severity fraud', async () => {
      const createDto = {
        fraud_type: 'account_sharing',
        severity: 'critical' as const,
        user_id: 'user-uuid',
        details: { reason: 'Multiple devices detected' },
      };

      const mockFraudLog = {
        id: 2,
        ...createDto,
        is_reviewed: false,
        created_at: new Date(),
      };

      mockFraudLogRepository.create.mockReturnValue(mockFraudLog);
      mockFraudLogRepository.save.mockResolvedValue(mockFraudLog);

      const result = await service.create(createDto);

      expect(result.severity).toBe('critical');
    });
  });

  describe('findAll', () => {
    it('should return all fraud logs without filters', async () => {
      const mockLogs = [
        { id: 1, fraud_type: 'mock_location', user_id: 'user-1' },
        { id: 2, fraud_type: 'account_sharing', user_id: 'user-2' },
      ];

      const result = await service.findAll();

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter by user_id', async () => {
      const result = await service.findAll('user-uuid');

      expect(mockFraudLogRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by fraud_type', async () => {
      const result = await service.findAll(undefined, 'mock_location');

      expect(mockFraudLogRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by severity', async () => {
      const result = await service.findAll(undefined, undefined, 'critical');

      expect(mockFraudLogRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by is_reviewed status', async () => {
      const result = await service.findAll(undefined, undefined, undefined, false);

      expect(mockFraudLogRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      const from = new Date('2026-01-01');
      const to = new Date('2026-12-31');

      const result = await service.findAll(undefined, undefined, undefined, undefined, from, to);

      expect(mockFraudLogRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('review', () => {
    it('should review a fraud log', async () => {
      const mockFraudLog = {
        id: 1,
        fraud_type: 'mock_location',
        is_reviewed: false,
        details: { reason: 'GPS spoofing' },
      };

      const reviewDto = {
        is_reviewed: true,
        notes: 'Confirmed fraud action',
      };

      mockFraudLogRepository.findOne.mockResolvedValue(mockFraudLog);
      mockFraudLogRepository.save.mockResolvedValue({
        ...mockFraudLog,
        is_reviewed: true,
        reviewed_by: 'reviewer-uuid',
        reviewed_at: new Date(),
        details: { ...mockFraudLog.details, review_notes: reviewDto.notes },
      });

      const result = await service.review(1, reviewDto, 'reviewer-uuid');

      expect(result.is_reviewed).toBe(true);
      expect(result.reviewed_by).toBe('reviewer-uuid');
    });

    it('should throw NotFoundException if fraud log not found', async () => {
      mockFraudLogRepository.findOne.mockResolvedValue(null);

      await expect(
        service.review(999, { is_reviewed: true }, 'reviewer-uuid'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.review(999, { is_reviewed: true }, 'reviewer-uuid'),
      ).rejects.toThrow('Инцидент не найден');
    });
  });

  describe('getUnreviewedCount', () => {
    it('should return count of unreviewed fraud logs', async () => {
      mockFraudLogRepository.count.mockResolvedValue(5);

      const result = await service.getUnreviewedCount();

      expect(result).toBe(5);
      expect(mockFraudLogRepository.count).toHaveBeenCalledWith({
        where: { is_reviewed: false },
      });
    });
  });

  describe('getStatsByType', () => {
    it('should return statistics grouped by fraud type', async () => {
      const mockStats = [
        { type: 'mock_location', count: '10' },
        { type: 'account_sharing', count: '5' },
      ];

      const result = await service.getStatsByType();

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});
