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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_PUBLIC_KEY'),
      algorithms: ['RS256'],
      issuer: 'checkin-service',
      audience: 'checkin-client',
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Недействительный токен');
    }

    // Проверка blacklist (для access token)
    // В production нужно проверять access token в blacklist
    // const token = ExtractJwt.fromAuthHeaderAsBearerToken();
    // const isBlacklisted = await this.redisService.isBlacklisted(token);
    // if (isBlacklisted) {
    //   throw new UnauthorizedException('Токен отозван');
    // }

    return {
      id: payload.sub,
      login: payload.login,
      role: payload.role,
      email: payload.email,
      device_fingerprint: payload.device_fingerprint,
    };
  }
}
