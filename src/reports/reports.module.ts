import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { BusesModule } from '../buses/buses.module';
import { LastStatusQueryService } from './services/last-status-query.service';
import { BackfillPreviewService } from './services/backfill-preview.service';
import { BackfillExecuteService } from './services/backfill-execute.service';
import { ReportsTelemetryConsumer } from './reports.telemetry.consumer';
import { BusGateway } from '../websocket/bus.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Report]), forwardRef(() => BusesModule)],
  controllers: [ReportsController, ReportsTelemetryConsumer],
  providers: [
    ReportsService,
    LastStatusQueryService,
    BackfillPreviewService,
    BackfillExecuteService,
    BusGateway,
    { provide: 'IReportsService', useExisting: ReportsService },
  ],
  exports: [ReportsService, 'IReportsService'],
})
export class ReportsModule {}
