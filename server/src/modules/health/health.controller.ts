import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Проверка состояния системы' })
  @ApiResponse({ status: 200, description: 'Система работает нормально' })
  @ApiResponse({ status: 503, description: 'Система имеет проблемы' })
  async check() {
    return this.healthService.check();
  }
}
