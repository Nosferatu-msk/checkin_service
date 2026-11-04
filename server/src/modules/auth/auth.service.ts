import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(login: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { login } });
    
    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    if (!user.is_active) {
      throw new ForbiddenException('Аккаунт заблокирован');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.login, loginDto.password);

    // Проверка device fingerprint
    if (user.device_fingerprint_hash && user.device_fingerprint_hash !== loginDto.device_fingerprint) {
      throw new ForbiddenException('Несовпадение отпечатка устройства');
    }

    // Обновление last_login_at
    await this.userRepository.update(user.id, { last_login_at: new Date() });

    // Генерация токенов
    const payload = {
      sub: user.id,
      login: user.login,
      role: user.role,
      email: user.email,
      device_fingerprint: loginDto.device_fingerprint,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION', '30d'),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      
      if (!user || !user.is_active) {
        throw new UnauthorizedException('Недействительный токен');
      }

      // Проверка device fingerprint
      if (payload.device_fingerprint !== user.device_fingerprint_hash) {
        throw new ForbiddenException('Несовпадение отпечатка устройства');
      }

      // Генерация нового access token
      const newPayload = {
        sub: user.id,
        login: user.login,
        role: user.role,
        email: user.email,
        device_fingerprint: payload.device_fingerprint,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
      });

      return {
        access_token: newAccessToken,
        expires_in: 900, // 15 минут в секундах
      };
    } catch (error) {
      throw new UnauthorizedException('Недействительный refresh token');
    }
  }

  async logout(refreshToken: string) {
    // В реальной реализации нужно добавить токен в blacklist в Redis
    // blacklist.add(refreshToken)
    return { message: 'Выход выполнен успешно' };
  }
}
