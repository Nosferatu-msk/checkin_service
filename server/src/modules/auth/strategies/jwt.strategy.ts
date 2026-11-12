import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
    
    if (!publicKey) {
      throw new Error('JWT_PUBLIC_KEY не установлен в переменных окружения');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      issuer: 'checkin-service',
      audience: 'checkin-client',
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Недействительный токен');
    }

    return {
      id: payload.sub,
      login: payload.login,
      role: payload.role,
      email: payload.email,
      device_fingerprint: payload.device_fingerprint,
    };
  }
}
