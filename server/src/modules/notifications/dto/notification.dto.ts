import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID пользователя' })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ example: 'fraud_alert', description: 'Тип уведомления' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Инцидент фрода', description: 'Заголовок' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Обнаружено перемещение < 5 минут', description: 'Текст' })
  @IsString()
  @IsNotEmpty()
  body: string;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'Прочитано', example: true })
  @IsBoolean()
  is_read: boolean;
}
