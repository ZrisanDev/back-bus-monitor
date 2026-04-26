import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { BusesModule } from '../buses/buses.module';
import { LastStatusQueryService } from './services/last-status-query.service';
import { BackfillPreviewService } from './services/backfill-preview.service';
import { BackfillExecuteService } from './services/backfill-execute.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report]), BusesModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    LastStatusQueryService,
    BackfillPreviewService,
    BackfillExecuteService,
    { provide: 'IReportsService', useExisting: ReportsService },
  ],
})
export class ReportsModule {}
