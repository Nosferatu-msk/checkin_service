import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateObjectDto {
  @ApiProperty({ example: 'БЦ "Москва"', description: 'Название объекта' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'RU/77/1', description: 'Код объекта (формат: Страна/Регион/Номер)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}\/\d+\/\d+$/, {
    message: 'Код объекта должен быть в формате XX/NN/NN (например, RU/77/1)',
  })
  object_code: string;

  @ApiProperty({ example: 'Россия', description: 'Страна', default: 'Россия', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'Москва', description: 'Регион', required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ example: 'Москва', description: 'Населённый пункт', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Примерная', description: 'Улица', required: false })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ example: '1', description: 'Дом', required: false })
  @IsString()
  @IsOptional()
  building?: string;

  @ApiProperty({ example: '1', description: 'Строение/корпус', required: false })
  @IsString()
  @IsOptional()
  structure?: string;

  @ApiProperty({ example: true, description: 'Активен ли объект', required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class UpdateObjectDto {
  @ApiProperty({ example: 'БЦ "Новый"', description: 'Название объекта', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'RU/77/2', description: 'Код объекта', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{2}\/\d+\/\d+$/, {
    message: 'Код объекта должен быть в формате XX/NN/NN (например, RU/77/1)',
  })
  object_code?: string;

  @ApiProperty({ example: 'Россия', description: 'Страна', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'Москва', description: 'Регион', required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ example: 'Москва', description: 'Населённый пункт', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Примерная', description: 'Улица', required: false })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ example: '1', description: 'Дом', required: false })
  @IsString()
  @IsOptional()
  building?: string;

  @ApiProperty({ example: '1', description: 'Строение/корпус', required: false })
  @IsString()
  @IsOptional()
  structure?: string;

  @ApiProperty({ example: true, description: 'Активен ли объект', required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
