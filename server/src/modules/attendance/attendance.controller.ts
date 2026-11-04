import {
  Controller,
  Get,
  Post,
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
import { AuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

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
    return {
      data: {
        allowed_beacon_uuids: [], // TODO: Загрузить из БД
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
  async submitAttendance(@Request() req, @Body() submitDto: SubmitAttendanceDto) {
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
    @Request() req,
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
  async registerPushToken(@Request() req, @Body() pushTokenDto: PushTokenDto) {
    // TODO: Сохранить токен в БД
    return {
      data: {
        message: 'Токен зарегистрирован',
        user_id: req.user.id,
        platform: pushTokenDto.platform,
      },
    };
  }
}
