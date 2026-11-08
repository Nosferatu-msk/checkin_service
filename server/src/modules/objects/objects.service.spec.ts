import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectsService } from './objects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectEntity } from './entities/object.entity';

describe('ObjectsService', () => {
  let service: ObjectsService;

  const mockObjectRepository: any = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
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
        ObjectsService,
        {
          provide: getRepositoryToken(ObjectEntity),
          useValue: mockObjectRepository,
        },
      ],
    }).compile();

    service = module.get<ObjectsService>(ObjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new object', async () => {
      const createDto = {
        name: 'Test Object',
        address: 'Test Address',
      };

      const mockObject = {
        id: 'uuid',
        ...createDto,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockObjectRepository.create.mockReturnValue(mockObject);
      mockObjectRepository.save.mockResolvedValue(mockObject);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect((result as any).name).toBe(createDto.name);
    });
  });

  describe('findOne', () => {
    it('should return object by id', async () => {
      const mockObject = {
        id: 'uuid',
        name: 'Test Object',
        is_active: true,
      };

      mockObjectRepository.findOne.mockResolvedValue(mockObject);

      const result = await service.findOne('uuid');

      expect(result).toBeDefined();
      expect((result as any).id).toBe('uuid');
    });

    it('should throw NotFoundException if object not found', async () => {
      mockObjectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Объект не найден',
      );
    });
  });
});
