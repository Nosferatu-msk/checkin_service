import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { RedisService } from '../../modules/redis/redis.service';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  constructor(private redisService: RedisService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = await super.canActivate(context);
    
    if (!result) {
      throw new UnauthorizedException('Недействительный токен');
    }
    
    // Проверка blacklist для access token
    const request = context.switchToHttp().getRequest();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    
    if (token) {
      const isBlacklisted = await this.redisService.isBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Токен отозван');
      }
    }
    
    return result as boolean;
  }
}
