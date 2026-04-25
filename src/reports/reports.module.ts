import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { BusesModule } from '../buses/buses.module';

@Module({
  imports: [TypeOrmModule.forFeature([Report]), BusesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
