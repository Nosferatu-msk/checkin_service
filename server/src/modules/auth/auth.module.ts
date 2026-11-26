import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '@/modules/users/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailModule } from '../email/email.module';

function getKeyFromConfig(configService: ConfigService, envVar: string, filePath: string): string {
  // First try to read from file
  try {
    const key = readFileSync(filePath, 'utf8');
    if (key && key.trim().length > 0) {
      return key;
    }
  } catch (e) {
    // File not found, try env variable
  }
  
  // Fallback to env variable
  const key = configService.get<string>(envVar);
  if (key) {
    // Replace escaped newlines with actual newlines
    return key.replace(/\\n/g, '\n');
  }
  
  return null;
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        privateKey: getKeyFromConfig(configService, 'JWT_PRIVATE_KEY', '/run/secrets/jwt_private'),
        publicKey: getKeyFromConfig(configService, 'JWT_PUBLIC_KEY', '/run/secrets/jwt_public'),
        signOptions: {
          algorithm: 'RS256',
          issuer: 'checkin-service',
          audience: 'checkin-client',
        },
      }),
    }),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
