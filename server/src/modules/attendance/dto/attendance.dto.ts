import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AttendanceRecordDto {
  @ApiProperty({ description: 'UUID маяка' })
  @IsString()
  @IsNotEmpty()
  beacon_uuid: string;

  @ApiProperty({ description: 'MAC адрес маяка', required: false })
  @IsString()
  @IsOptional()
  mac_address?: string;

  @ApiProperty({ description: 'Major' })
  @IsNumber()
  major: number;

  @ApiProperty({ description: 'Minor' })
  @IsNumber()
  minor: number;

  @ApiProperty({ description: 'Начало сканирования' })
  @IsDateString()
  scan_timestamp_start: string;

  @ApiProperty({ description: 'Конец сканирования' })
  @IsDateString()
  scan_timestamp_end: string;

  @ApiProperty({ description: 'Медианный RSSI' })
  @IsNumber()
  median_rssi: number;

  @ApiProperty({ description: 'Минимальный RSSI', required: false })
  @IsNumber()
  @IsOptional()
  min_rssi?: number;

  @ApiProperty({ description: 'Максимальный RSSI', required: false })
  @IsNumber()
  @IsOptional()
  max_rssi?: number;

  @ApiProperty({ description: 'Количество замеров' })
  @IsNumber()
  samples_count: number;

  @ApiProperty({ description: 'Отпечаток устройства' })
  @IsString()
  @IsNotEmpty()
  device_fingerprint: string;
}

export class SubmitAttendanceDto {
  @ApiProperty({ description: 'Уникальный ID запроса для защиты от replay' })
  @IsString()
  @IsNotEmpty()
  request_id: string;

  @ApiProperty({ description: 'Массив записей присутствия', type: [AttendanceRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}

export class BeaconTelemetryDto {
  @ApiProperty({ description: 'UUID маяка' })
  @IsString()
  @IsNotEmpty()
  beacon_uuid: string;

  @ApiProperty({ description: 'MAC адрес маяка', required: false })
  @IsString()
  @IsOptional()
  mac_address?: string;

  @ApiProperty({ description: 'Уровень заряда батареи (0-100)' })
  @IsNumber()
  battery_level: number;

  @ApiProperty({ description: 'Версия прошивки', required: false })
  @IsString()
  @IsOptional()
  firmware_version?: string;

  @ApiProperty({ description: 'Температура', required: false })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiProperty({ description: 'Время последнего сканирования' })
  @IsDateString()
  last_seen_at: string;
}

export class SubmitBeaconTelemetryDto {
  @ApiProperty({ description: 'Массив телеметрии маяков', type: [BeaconTelemetryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BeaconTelemetryDto)
  beacons: BeaconTelemetryDto[];
}
