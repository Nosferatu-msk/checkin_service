import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateZoneDto {
  @ApiProperty({ example: 'Этаж 1', description: 'Название зоны' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'ID объекта' })
  @IsUUID()
  @IsNotEmpty()
  object_id: string;

  @ApiProperty({ description: 'ID родительской зоны', required: false })
  @IsUUID()
  @IsOptional()
  parent_zone_id?: string;

  @ApiProperty({ example: 'floor', enum: ['floor', 'room', 'zone'], description: 'Тип зоны' })
  @IsEnum(['floor', 'room', 'zone'])
  zone_type: 'floor' | 'room' | 'zone';

  @ApiProperty({ example: -75.0, description: 'Порог RSSI', required: false })
  @IsNumber()
  @IsOptional()
  rssi_threshold?: number;
}

export class UpdateZoneDto {
  @ApiProperty({ example: 'Этаж 2', description: 'Название зоны', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'ID родительской зоны', required: false })
  @IsUUID()
  @IsOptional()
  parent_zone_id?: string;

  @ApiProperty({ example: 'room', enum: ['floor', 'room', 'zone'], required: false })
  @IsEnum(['floor', 'room', 'zone'])
  @IsOptional()
  zone_type?: 'floor' | 'room' | 'zone';

  @ApiProperty({ example: -70.0, description: 'Порог RSSI', required: false })
  @IsNumber()
  @IsOptional()
  rssi_threshold?: number;
}
