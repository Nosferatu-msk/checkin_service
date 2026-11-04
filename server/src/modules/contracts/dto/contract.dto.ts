import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({ example: 'Договор №123', description: 'Название договора' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '123/2026', description: 'Номер договора', required: false })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiProperty({ example: '2026-01-01', description: 'Дата начала', required: false })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiProperty({ example: '2026-12-31', description: 'Дата окончания', required: false })
  @IsDateString()
  @IsOptional()
  end_date?: string;
}

export class UpdateContractDto {
  @ApiProperty({ example: 'Договор №456', description: 'Название договора', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '456/2026', description: 'Номер договора', required: false })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiProperty({ example: '2027-12-31', description: 'Дата окончания', required: false })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiProperty({ example: true, description: 'Активен ли договор', required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class AddObjectsDto {
  @ApiProperty({ description: 'Массив ID объектов', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  object_ids: string[];
}

export class AddEmployeesDto {
  @ApiProperty({ description: 'Массив ID сотрудников', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  employee_ids: string[];
}

export class AddCuratorsDto {
  @ApiProperty({ description: 'Массив ID кураторов', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  curator_ids: string[];
}
