import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PushTokenDto {
  @ApiProperty({ description: 'FCM push token' })
  @IsString()
  @IsNotEmpty()
  push_token: string;

  @ApiProperty({ example: 'android', enum: ['android', 'ios', 'web'], description: 'Платформа' })
  @IsEnum(['android', 'ios', 'web'])
  platform: 'android' | 'ios' | 'web';
}
