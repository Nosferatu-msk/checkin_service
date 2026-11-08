import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { Contract } from './entities/contract.entity';
import { ObjectEntity } from '../objects/entities/object.entity';
import { User } from '@/modules/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ObjectEntity, User])],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
