import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty({ example: 'abc123def456', description: 'Fingerprint устройства' })
  @IsString()
  @IsNotEmpty()
  device_fingerprint: string;

  @ApiProperty({ example: 'iPhone 14 Pro', description: 'Название устройства' })
  @IsString()
  @IsNotEmpty()
  device_name: string;

  @ApiPropertyOptional({ example: true, description: 'Доверенное устройство', default: true })
  @IsOptional()
  @IsBoolean()
  is_trusted?: boolean;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: 'iPhone 14 Pro Max', description: 'Название устройства' })
  @IsOptional()
  @IsString()
  device_name?: string;

  @ApiPropertyOptional({ example: true, description: 'Доверенное устройство' })
  @IsOptional()
  @IsBoolean()
  is_trusted?: boolean;
}
