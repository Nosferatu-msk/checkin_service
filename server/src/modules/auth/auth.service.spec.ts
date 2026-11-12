import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUserRepository: any = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService: any = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService: any = {
    get: jest.fn(),
  };

  const mockRedisService: any = {
    addToBlacklist: jest.fn(),
    isBlacklisted: jest.fn(),
    removeFromBlacklist: jest.fn(),
    setDeviceFingerprint: jest.fn(),
    getDeviceFingerprint: jest.fn(),
    deleteDeviceFingerprint: jest.fn(),
    deleteSession: jest.fn(),
  };

  const mockEmailService: any = {
    sendPasswordResetEmail: jest.fn(),
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
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
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

  describe('forgotPassword', () => {
    it('should return success message even if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result).toEqual({ message: 'Инструкции по сбросу пароля отправлены на email' });
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return success message and send email if user exists', async () => {
      const mockUser = {
        id: 'uuid',
        email: 'user@example.com',
        is_active: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('reset-token');

      const result = await service.forgotPassword('user@example.com');

      expect(result).toEqual({ message: 'Инструкции по сбросу пароля отправлены на email' });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'uuid', type: 'reset', email: 'user@example.com' },
        { expiresIn: '1h' },
      );
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        'reset-token',
      );
    });

    it('should not send email for inactive user', async () => {
      const mockUser = {
        id: 'uuid',
        email: 'inactive@example.com',
        is_active: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.forgotPassword('inactive@example.com');

      expect(result).toEqual({ message: 'Инструкции по сбросу пароля отправлены на email' });
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password and invalidate sessions', async () => {
      const mockPayload = { sub: 'uuid', type: 'reset', email: 'user@example.com' };
      const mockUser = {
        id: 'uuid',
        is_active: true,
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.resetPassword('valid-token', 'newPassword123');

      expect(result).toEqual({ message: 'Пароль успешно сброшен' });
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(mockRedisService.deleteSession).toHaveBeenCalledWith('session:uuid');
      expect(mockRedisService.deleteDeviceFingerprint).toHaveBeenCalledWith('uuid');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.resetPassword('invalid-token', 'newPassword123')).rejects.toThrow(
        'Недействительный или истекший токен',
      );
    });

    it('should throw UnauthorizedException for wrong token type', async () => {
      const mockPayload = { sub: 'uuid', type: 'access', email: 'user@example.com' };
      mockJwtService.verify.mockReturnValue(mockPayload);

      await expect(service.resetPassword('wrong-type-token', 'newPassword123')).rejects.toThrow(
        'Недействительный тип токена',
      );
    });

    it('should throw ForbiddenException for inactive user', async () => {
      const mockPayload = { sub: 'uuid', type: 'reset', email: 'user@example.com' };
      const mockUser = {
        id: 'uuid',
        is_active: false,
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.resetPassword('valid-token', 'newPassword123')).rejects.toThrow(
        'Аккаунт заблокирован',
      );
    });
  });
});
