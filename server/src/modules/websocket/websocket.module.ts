import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        let publicKey: string;
        try {
          publicKey = readFileSync('/run/secrets/jwt_public', 'utf8');
        } catch (e) {
          const envKey = configService.get<string>('JWT_PUBLIC_KEY');
          if (envKey) {
            publicKey = envKey.replace(/\\n/g, '\n');
          }
        }
        return {
          publicKey,
          signOptions: {
            algorithm: 'RS256',
            issuer: 'checkin-service',
            audience: 'checkin-client',
          },
        };
      },
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class WebsocketModule {}
