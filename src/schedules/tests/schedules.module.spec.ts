import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchedulesModule } from '../schedules.module';
import { SchedulesService } from '../schedules.service';
import { SchedulesController } from '../schedules.controller';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleLookupService } from '../services/schedule-lookup.service';

describe('SchedulesModule', () => {
  let module: any;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [SchedulesModule],
    })
      .overrideProvider(getRepositoryToken(Schedule))
      .useValue({
        find: jest.fn(),
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        merge: jest.fn(),
        query: jest.fn(),
      })
      .compile();
  });

  it('should provide SchedulesService', () => {
    const service = module.get<SchedulesService>(SchedulesService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(SchedulesService);
  });

  it('should provide SchedulesController', () => {
    const controller = module.get<SchedulesController>(SchedulesController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(SchedulesController);
  });

  it('should export SchedulesService', () => {
    const service = module.get<SchedulesService>(SchedulesService);
    expect(service).toBeDefined();
  });

  it('should provide ISchedulesService token resolving to SchedulesService', () => {
    const tokenService = module.get('ISchedulesService');
    const concreteService = module.get<SchedulesService>(SchedulesService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });

  // ── SCN: TASK-014 — ScheduleLookupService is provided ──────────────────

  it('should provide ScheduleLookupService', () => {
    const lookupService = module.get<ScheduleLookupService>(ScheduleLookupService);
    expect(lookupService).toBeDefined();
    expect(lookupService).toBeInstanceOf(ScheduleLookupService);
  });
});
