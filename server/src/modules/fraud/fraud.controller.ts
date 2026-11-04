import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FraudService } from './fraud.service';
import { CreateFraudLogDto, ReviewFraudDto } from './dto/fraud.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('fraud')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('admin/fraud')
@Roles('admin')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post()
  @ApiOperation({ summary: 'Создание записи о фроде' })
  @ApiResponse({ status: 201, description: 'Запись создана' })
  async create(@Body() createDto: CreateFraudLogDto) {
    const fraudLog = await this.fraudService.create(createDto);
    return { data: fraudLog };
  }

  @Get()
  @ApiOperation({ summary: 'Получение списка инцидентов фрода' })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'fraud_type', required: false })
  @ApiQuery({ name: 'severity', required: false, enum: ['info', 'warning', 'critical'] })
  @ApiQuery({ name: 'is_reviewed', required: false, type: Boolean })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, description: 'Список инцидентов' })
  async findAll(
    @Query('user_id') userId?: string,
    @Query('fraud_type') fraudType?: string,
    @Query('severity') severity?: string,
    @Query('is_reviewed') isReviewed?: boolean,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.fraudService.findAll(
      userId,
      fraudType,
      severity,
      isReviewed,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('unreviewed-count')
  @ApiOperation({ summary: 'Получение количества непросмотренных инцидентов' })
  @ApiResponse({ status: 200, description: 'Количество непросмотренных' })
  async getUnreviewedCount() {
    const count = await this.fraudService.getUnreviewedCount();
    return { data: { count } };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получение статистики по типам фрода' })
  @ApiResponse({ status: 200, description: 'Статистика' })
  async getStats() {
    return this.fraudService.getStatsByType();
  }

  @Put(':id/review')
  @ApiOperation({ summary: 'Отметить инцидент как просмотренный' })
  @ApiResponse({ status: 200, description: 'Инцидент обновлен' })
  @ApiResponse({ status: 404, description: 'Инцидент не найден' })
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewDto: ReviewFraudDto,
    @Request() req,
  ) {
    const fraudLog = await this.fraudService.review(id, reviewDto, req.user.id);
    return { data: fraudLog };
  }
}
