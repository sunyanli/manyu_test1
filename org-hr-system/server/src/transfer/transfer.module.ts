import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferLog } from './transfer-log.entity';
import { Employee } from '../employee/employee.entity';
import { Department } from '../department/department.entity';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TransferLog, Employee, Department])],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TypeOrmModule, TransferService],
})
export class TransferModule {}