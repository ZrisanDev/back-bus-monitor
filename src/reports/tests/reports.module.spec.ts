import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsModule } from '../reports.module';
import { ReportsService } from '../reports.service';
import { ReportsController } from '../reports.controller';
import { Report } from '../entities/report.entity';
import { Bus } from '../../buses/entities/bus.entity';
import { LastStatusQueryService } from '../services/last-status-query.service';
import { BackfillPreviewService } from '../services/backfill-preview.service';
import { BackfillExecuteService } from '../services/backfill-execute.service';
import { MaxPassengersValidator } from '../../buses/validators/max-passengers.validator';

describe('ReportsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ReportsModule],
    })
      .overrideProvider(getRepositoryToken(Report))
      .useValue({
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        query: jest.fn(),
      })
      .overrideProvider(getRepositoryToken(Bus))
      .useValue({
        find: jest.fn(),
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      })
      .compile();
  });

  // ── SCN: ReportsService is provided ────────────────────────────────────

  it('should provide ReportsService', () => {
    const service = module.get<ReportsService>(ReportsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ReportsService);
  });

  // ── SCN: ReportsController is provided ─────────────────────────────────

  it('should provide ReportsController', () => {
    const controller = module.get<ReportsController>(ReportsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ReportsController);
  });

  // ── SCN: IBusesService token is available from BusesModule import ──────

  it('should have IBusesService token available via BusesModule import', () => {
    const busesService = module.get('IBusesService');
    expect(busesService).toBeDefined();
  });

  // ── SCN: 'IReportsService' token resolves to ReportsService instance ────

  it('should provide IReportsService token resolving to ReportsService', () => {
    const tokenService = module.get('IReportsService');
    const concreteService = module.get<ReportsService>(ReportsService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });

  // ── SCN: LastStatusQueryService is provided ─────────────────────────────

  it('should provide LastStatusQueryService', () => {
    const lastStatusService =
      module.get<LastStatusQueryService>(LastStatusQueryService);
    expect(lastStatusService).toBeDefined();
    expect(lastStatusService).toBeInstanceOf(LastStatusQueryService);
  });

  // ── SCN: ICapacityValidator token is available from BusesModule import ──

  it('should have ICapacityValidator token available via BusesModule import', () => {
    const validator = module.get('ICapacityValidator');
    expect(validator).toBeDefined();
    expect(validator).toBeInstanceOf(MaxPassengersValidator);
  });

  // ── SCN: IBusReader token is available from BusesModule import (ISP) ────

  it('should have IBusReader token available via BusesModule import', () => {
    const busReader = module.get('IBusReader');
    expect(busReader).toBeDefined();
  });

  // ── SCN: BackfillPreviewService is provided (TASK-011) ──────────────────

  it('should provide BackfillPreviewService', () => {
    const backfillService = module.get<BackfillPreviewService>(BackfillPreviewService);
    expect(backfillService).toBeDefined();
    expect(backfillService).toBeInstanceOf(BackfillPreviewService);
  });

  // ── SCN: BackfillExecuteService is provided (TASK-012) ──────────────────

  it('should provide BackfillExecuteService', () => {
    const backfillExecService = module.get<BackfillExecuteService>(BackfillExecuteService);
    expect(backfillExecService).toBeDefined();
    expect(backfillExecService).toBeInstanceOf(BackfillExecuteService);
  });
});
