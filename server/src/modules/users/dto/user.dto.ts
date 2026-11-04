import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'ivanov', description: 'Логин пользователя' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: 'ivanov@example.com', description: 'Email', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+79991234567', description: 'Телефон', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Иванов Иван Иванович', description: 'ФИО' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ example: 'employee', enum: ['admin', 'curator', 'employee'], description: 'Роль' })
  @IsEnum(['admin', 'curator', 'employee'])
  role: 'admin' | 'curator' | 'employee';

  @ApiProperty({ example: 'TempPassword123!', description: 'Пароль', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'Иванов Иван Иванович', description: 'ФИО', required: false })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ example: 'curator', enum: ['admin', 'curator', 'employee'], required: false })
  @IsEnum(['admin', 'curator', 'employee'])
  @IsOptional()
  role?: 'admin' | 'curator' | 'employee';

  @ApiProperty({ example: true, description: 'Активен ли пользователь', required: false })
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({ example: '+79991234567', description: 'Телефон', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}
