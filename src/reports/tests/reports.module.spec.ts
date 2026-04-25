import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsModule } from '../reports.module';
import { ReportsService } from '../reports.service';
import { ReportsController } from '../reports.controller';
import { Report } from '../entities/report.entity';
import { BusesService } from '../../buses/buses.service';
import { Bus } from '../../buses/entities/bus.entity';

describe('ReportsModule', () => {
  let module: any;

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

  // ── SCN: BusesService is available from BusesModule import ─────────────

  it('should have BusesService available via BusesModule import', () => {
    const busesService = module.get<BusesService>(BusesService);
    expect(busesService).toBeDefined();
  });
});
