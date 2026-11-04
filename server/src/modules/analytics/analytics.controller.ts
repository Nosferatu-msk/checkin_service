import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('admin')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('admin', 'curator')
  @ApiOperation({ summary: 'Получение данных для дашборда' })
  @ApiResponse({ status: 200, description: 'Данные дашборда' })
  async getDashboard(@Request() req) {
    const data = await this.analyticsService.getDashboardData(req.user.id, req.user.role);
    return { data };
  }

  @Get('analytics/attendance')
  @Roles('admin', 'curator')
  @ApiOperation({ summary: 'Аналитика присутствия' })
  @ApiQuery({ name: 'from', required: true, description: 'Начало периода' })
  @ApiQuery({ name: 'to', required: true, description: 'Конец периода' })
  @ApiQuery({ name: 'user_id', required: false, description: 'ID пользователя' })
  @ApiResponse({ status: 200, description: 'Аналитика присутствия' })
  async getAttendanceAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('user_id') userId?: string,
  ) {
    return this.analyticsService.getAttendanceAnalytics(
      new Date(from),
      new Date(to),
      userId,
    );
  }

  @Get('analytics/sla')
  @Roles('admin', 'curator')
  @ApiOperation({ summary: 'Аналитика SLA' })
  @ApiQuery({ name: 'from', required: true, description: 'Начало периода' })
  @ApiQuery({ name: 'to', required: true, description: 'Конец периода' })
  @ApiQuery({ name: 'contract_id', required: false, description: 'ID договора' })
  @ApiResponse({ status: 200, description: 'Аналитика SLA' })
  async getSlaAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('contract_id') contractId?: string,
  ) {
    return this.analyticsService.getSlaAnalytics(
      new Date(from),
      new Date(to),
      contractId,
    );
  }
}
