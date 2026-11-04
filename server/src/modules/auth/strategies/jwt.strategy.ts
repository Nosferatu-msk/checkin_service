import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
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

    return {
      id: payload.sub,
      login: payload.login,
      role: payload.role,
      email: payload.email,
      device_fingerprint: payload.device_fingerprint,
    };
  }
}
