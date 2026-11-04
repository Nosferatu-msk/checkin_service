import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFraudLogDto {
  @ApiProperty({ description: 'ID пользователя', required: false })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiProperty({ 
    example: 'teleportation', 
    enum: [
      'device_mismatch',
      'device_changed',
      'simultaneous_presence',
      'teleportation',
      'emulator_detected',
      'root_detected',
      'mock_location',
      'beacon_clone_detected',
      'clock_skew_detected'
    ],
    description: 'Тип фрода' 
  })
  @IsString()
  @IsNotEmpty()
  fraud_type: string;

  @ApiProperty({ description: 'Детали инцидента' })
  @IsObject()
  @IsNotEmpty()
  details: any;

  @ApiProperty({ example: 'warning', enum: ['info', 'warning', 'critical'], description: 'Серьёзность' })
  @IsEnum(['info', 'warning', 'critical'])
  @IsOptional()
  severity?: 'info' | 'warning' | 'critical';
}

export class ReviewFraudDto {
  @ApiProperty({ description: 'Просмотрено', example: true })
  @IsBoolean()
  is_reviewed: boolean;

  @ApiProperty({ description: 'Комментарий', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
