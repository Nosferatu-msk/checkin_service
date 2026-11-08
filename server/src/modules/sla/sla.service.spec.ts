import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SlaService } from './sla.service';
import { ZoneRequirement } from './entities/zone-requirement.entity';
import { RequirementViolation } from './entities/requirement-violation.entity';
import { NotFoundException } from '@nestjs/common';

describe('SlaService', () => {
  let service: SlaService;

  const mockRequirementRepository: any = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: (jest.fn() as any).mockResolvedValue([]),
    })),
  };

  const mockViolationRepository: any = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: (jest.fn() as any).mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaService,
        {
          provide: getRepositoryToken(ZoneRequirement),
          useValue: mockRequirementRepository,
        },
        {
          provide: getRepositoryToken(RequirementViolation),
          useValue: mockViolationRepository,
        },
      ],
    }).compile();

    service = module.get<SlaService>(SlaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRequirement', () => {
    it('should create a zone requirement', async () => {
      const createDto = {
        zone_id: 'zone-uuid',
        contract_id: 'contract-uuid',
        min_employees: 2,
        visits_count: 1,
        period_type: 'daily' as const,
      };

      const mockRequirement = {
        id: 'req-uuid',
        ...createDto,
        is_active: true,
        created_at: new Date(),
      };

      mockRequirementRepository.create.mockReturnValue(mockRequirement);
      mockRequirementRepository.save.mockResolvedValue(mockRequirement);

      const result = await service.createRequirement(createDto);

      expect(result).toBeDefined();
      expect((result as any).min_employees).toBe(createDto.min_employees);
      expect((result as any).is_active).toBe(true);
    });
  });

  describe('findAllRequirements', () => {
    it('should return all requirements without filters', async () => {
      const result = await service.findAllRequirements();

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter by zone_id', async () => {
      const result = await service.findAllRequirements('zone-uuid');

      expect(mockRequirementRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by contract_id', async () => {
      const result = await service.findAllRequirements(undefined, 'contract-uuid');

      expect(mockRequirementRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by is_active', async () => {
      const result = await service.findAllRequirements(undefined, undefined, true);

      expect(mockRequirementRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('updateRequirement', () => {
    it('should update a requirement', async () => {
      const mockRequirement = {
        id: 'req-uuid',
        min_employees: 2,
      };

      const updateDto = {
        min_employees: 3,
      };

      mockRequirementRepository.findOne.mockResolvedValue(mockRequirement);
      mockRequirementRepository.save.mockResolvedValue({
        ...mockRequirement,
        ...updateDto,
      });

      const result = await service.updateRequirement('req-uuid', updateDto);

      expect((result as any).min_employees).toBe(3);
    });

    it('should throw NotFoundException if requirement not found', async () => {
      mockRequirementRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateRequirement('non-existent', { min_employees: 3 }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.updateRequirement('non-existent', { min_employees: 3 }),
      ).rejects.toThrow('Норматив не найден');
    });
  });

  describe('removeRequirement', () => {
    it('should remove a requirement', async () => {
      const mockRequirement = {
        id: 'req-uuid',
      };

      mockRequirementRepository.findOne.mockResolvedValue(mockRequirement);
      mockRequirementRepository.remove.mockResolvedValue(undefined);

      await expect(service.removeRequirement('req-uuid')).resolves.toBeUndefined();
    });

    it('should throw NotFoundException if requirement not found', async () => {
      mockRequirementRepository.findOne.mockResolvedValue(null);

      await expect(service.removeRequirement('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getViolations', () => {
    it('should return all violations without filters', async () => {
      const result = await service.getViolations();

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter by date range', async () => {
      const from = new Date('2026-01-01');
      const to = new Date('2026-12-31');

      const result = await service.getViolations(from, to);

      expect(mockViolationRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by contract_id', async () => {
      const result = await service.getViolations(undefined, undefined, 'contract-uuid');

      expect(mockViolationRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
