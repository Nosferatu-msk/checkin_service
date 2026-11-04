import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const createUserDto = {
        login: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'employee' as const,
        password: 'password123',
      };

      const mockUser = {
        id: 'uuid',
        ...createUserDto,
        password_hash: await bcrypt.hash(createUserDto.password, 12),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.login).toBe(createUserDto.login);
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toBe(createUserDto.password);
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto = {
        login: 'existinguser',
        email: 'existing@example.com',
        role: 'employee' as const,
        password: 'password123',
      };

      mockUserRepository.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Пользователь с таким логином уже существует',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const result = await service.findAll(1, 20);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.page).toBe(1);
      expect(result.meta.per_page).toBe(20);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 'uuid',
        login: 'testuser',
        email: 'test@example.com',
        role: 'employee',
        is_active: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('uuid');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Пользователь не найден',
      );
    });
  });
});
