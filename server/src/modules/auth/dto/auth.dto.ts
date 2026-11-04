import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Логин пользователя' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: 'password123', description: 'Пароль пользователя' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'sha256_hash_here', description: 'Отпечаток устройства' })
  @IsString()
  @IsNotEmpty()
  device_fingerprint: string;

  @ApiProperty({ example: 'fcm_token_here', description: 'FCM push токен', required: false })
  @IsString()
  push_token?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email пользователя' })
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Токен для сброса пароля' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Новый пароль', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  new_password: string;
}
