import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateObjectDto {
  @ApiProperty({ example: 'БЦ "Москва"', description: 'Название объекта' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'г. Москва, ул. Примерная, д. 1', description: 'Адрес', required: false })
  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateObjectDto {
  @ApiProperty({ example: 'БЦ "Новый"', description: 'Название объекта', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'г. Москва, ул. Новая, д. 2', description: 'Адрес', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: true, description: 'Активен ли объект', required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
