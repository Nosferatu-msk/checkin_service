import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { readFileSync } from 'fs';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    // Read public key from file
    let publicKey: string;
    try {
      publicKey = readFileSync('/run/secrets/jwt_public', 'utf8');
    } catch (e) {
      // Fallback to env variable
      const envKey = configService.get<string>('JWT_PUBLIC_KEY');
      if (envKey) {
        publicKey = envKey.replace(/\\n/g, '\n');
      } else {
        throw new Error('JWT_PUBLIC_KEY не установлен');
      }
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
