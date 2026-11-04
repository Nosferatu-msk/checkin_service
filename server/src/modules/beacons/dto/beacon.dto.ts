import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsBoolean, IsDateString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBeaconDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID маяка' })
  @IsString()
  @IsNotEmpty()
  uuid: string;

  @ApiProperty({ example: 1, description: 'Major' })
  @IsNumber()
  major: number;

  @ApiProperty({ example: 100, description: 'Minor' })
  @IsNumber()
  minor: number;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF', description: 'MAC адрес', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, {
    message: 'MAC адрес должен быть в формате XX:XX:XX:XX:XX:XX',
  })
  mac_address?: string;

  @ApiProperty({ description: 'ID зоны' })
  @IsUUID()
  @IsNotEmpty()
  zone_id: string;

  @ApiProperty({ example: -59, description: 'TX power', required: false })
  @IsNumber()
  @IsOptional()
  tx_power?: number;

  @ApiProperty({ example: '2026-01-15', description: 'Дата установки', required: false })
  @IsDateString()
  @IsOptional()
  installed_at?: string;
}

export class UpdateBeaconDto {
  @ApiProperty({ description: 'ID зоны', required: false })
  @IsUUID()
  @IsOptional()
  zone_id?: string;

  @ApiProperty({ example: -55, description: 'TX power', required: false })
  @IsNumber()
  @IsOptional()
  tx_power?: number;

  @ApiProperty({ example: true, description: 'Активен ли маяк', required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF', description: 'MAC адрес', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, {
    message: 'MAC адрес должен быть в формате XX:XX:XX:XX:XX:XX',
  })
  mac_address?: string;
}
