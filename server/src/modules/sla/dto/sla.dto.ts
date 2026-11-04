import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateZoneRequirementDto {
  @ApiProperty({ description: 'ID зоны' })
  @IsUUID()
  @IsNotEmpty()
  zone_id: string;

  @ApiProperty({ description: 'ID договора' })
  @IsUUID()
  @IsNotEmpty()
  contract_id: string;

  @ApiProperty({ example: 2, description: 'Минимальное количество сотрудников' })
  @IsNumber()
  @IsNotEmpty()
  min_employees: number;

  @ApiProperty({ example: 1, description: 'Минимальное количество посещений' })
  @IsNumber()
  @IsNotEmpty()
  visits_count: number;

  @ApiProperty({ example: 'daily', enum: ['daily', 'weekly', 'monthly'], description: 'Тип периода' })
  @IsEnum(['daily', 'weekly', 'monthly'])
  period_type: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({ example: 127, description: 'Маска дней недели (пн=1, вт=2, ..., вс=64)', required: false })
  @IsNumber()
  @IsOptional()
  weekdays_mask?: number;
}

export class UpdateZoneRequirementDto {
  @ApiProperty({ example: 3, description: 'Минимальное количество сотрудников', required: false })
  @IsNumber()
  @IsOptional()
  min_employees?: number;

  @ApiProperty({ example: 2, description: 'Минимальное количество посещений', required: false })
  @IsNumber()
  @IsOptional()
  visits_count?: number;

  @ApiProperty({ example: 'weekly', enum: ['daily', 'weekly', 'monthly'], required: false })
  @IsEnum(['daily', 'weekly', 'monthly'])
  @IsOptional()
  period_type?: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({ example: 31, description: 'Маска дней недели', required: false })
  @IsNumber()
  @IsOptional()
  weekdays_mask?: number;

  @ApiProperty({ example: true, description: 'Активен ли норматив', required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
