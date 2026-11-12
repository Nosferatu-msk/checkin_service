import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObjectsController } from './objects.controller';
import { ObjectsService } from './objects.service';
import { ObjectEntity } from './entities/object.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ObjectEntity])],
  controllers: [ObjectsController],
  providers: [ObjectsService],
  exports: [ObjectsService], // Экспортируем для использования в ImportExportModule
})
export class ObjectsModule {}
