import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { SubmitAttendanceDto, SubmitBeaconTelemetryDto } from './dto/attendance.dto';
import { PushTokenDto } from './dto/push-token.dto';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest } from '../../common/types/request.types';

@ApiTags('mobile')
@Controller('mobile')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly configService: ConfigService,
  ) {}

  @Get('settings')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получение настроек для мобильного приложения' })
  @ApiResponse({ status: 200, description: 'Настройки получены' })
  async getSettings() {
    const allowedBeaconUuids = await this.attendanceService.getActiveBeaconUuids();

    return {
      data: {
        allowed_beacon_uuids: allowedBeaconUuids,
        aggregation_interval_sec: this.configService.get<number>('AGGREGATION_INTERVAL_SEC', 600),
        sync_interval_sec: this.configService.get<number>('SYNC_INTERVAL_SEC', 600),
        scan_duty_cycle: {
          scan_duration_ms: 3000,
          pause_duration_ms: 7000,
        },
        security: {
          require_fingerprint: true,
          forbid_emulators: true,
          require_play_integrity: true,
        },
      },
    };
  }

  @Post('attendance')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправка данных присутствия' })
  @ApiResponse({ status: 200, description: 'Данные приняты' })
  @ApiResponse({ status: 409, description: 'Дублирующийся запрос' })
  async submitAttendance(
    @Request() req: AuthenticatedRequest,
    @Body() submitDto: SubmitAttendanceDto,
  ) {
    return this.attendanceService.submitAttendance(req.user.id, submitDto);
  }

  @Post('beacon-telemetry')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправка телеметрии маяков' })
  @ApiResponse({ status: 200, description: 'Телеметрия принята' })
  async submitBeaconTelemetry(@Body() telemetryDto: SubmitBeaconTelemetryDto) {
    return this.attendanceService.submitBeaconTelemetry(telemetryDto);
  }

  @Get('my-attendance')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получение истории присутствия' })
  @ApiQuery({ name: 'from', required: false, description: 'Начало периода' })
  @ApiQuery({ name: 'to', required: false, description: 'Конец периода' })
  @ApiResponse({ status: 200, description: 'История присутствия' })
  async getMyAttendance(
    @Request() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.getMyAttendance(
      req.user.id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post('push-token')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Регистрация push-токена для FCM' })
  @ApiResponse({ status: 200, description: 'Токен зарегистрирован' })
  async registerPushToken(
    @Request() req: AuthenticatedRequest,
    @Body() pushTokenDto: PushTokenDto,
  ) {
    const result = await this.attendanceService.savePushToken(
      req.user.id,
      pushTokenDto.push_token,
      pushTokenDto.platform,
    );
    return { data: result };
  }

  @Delete('push-token')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удаление push-токена' })
  @ApiQuery({ name: 'push_token', required: false, description: 'Конкретный токен для удаления' })
  @ApiResponse({ status: 200, description: 'Токен удалён' })
  async removePushToken(
    @Request() req: AuthenticatedRequest,
    @Query('push_token') pushToken?: string,
  ) {
    const result = await this.attendanceService.removePushToken(req.user.id, pushToken);
    return { data: result };
  }
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(PassportAuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AdminAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('attendance')
  @Roles('admin', 'curator')
  @ApiOperation({ summary: 'Получение всех записей присутствия (для админов)' })
  @ApiQuery({ name: 'from', required: false, description: 'Начало периода' })
  @ApiQuery({ name: 'to', required: false, description: 'Конец периода' })
  @ApiQuery({ name: 'user_id', required: false, description: 'Фильтр по пользователю' })
  @ApiQuery({ name: 'object_id', required: false, description: 'Фильтр по объекту' })
  @ApiResponse({ status: 200, description: 'Записи присутствия' })
  async getAllAttendance(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('user_id') userId?: string,
    @Query('object_id') objectId?: string,
  ) {
    return this.attendanceService.getAllAttendance(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      userId,
      objectId,
    );
  }
}
