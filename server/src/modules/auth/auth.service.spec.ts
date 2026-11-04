import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const mockUser = {
        id: 'uuid',
        login: 'admin',
        password_hash: passwordHash,
        is_active: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('admin', password);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { login: 'admin' } });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUser('invalid', 'password')).rejects.toThrow(
        'Неверный логин или пароль',
      );
    });

    it('should throw ForbiddenException if user is inactive', async () => {
      const mockUser = {
        id: 'uuid',
        login: 'admin',
        password_hash: await bcrypt.hash('password', 12),
        is_active: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.validateUser('admin', 'password')).rejects.toThrow(
        'Аккаунт заблокирован',
      );
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 12);
      
      const mockUser = {
        id: 'uuid',
        login: 'admin',
        email: 'admin@example.com',
        full_name: 'Admin User',
        role: 'admin',
        password_hash: passwordHash,
        is_active: true,
        device_fingerprint_hash: 'fingerprint',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.login({
        login: 'admin',
        password,
        device_fingerprint: 'fingerprint',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user.login).toBe('admin');
    });
  });
});
