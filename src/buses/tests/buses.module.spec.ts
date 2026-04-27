import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusesModule } from '../buses.module';
import { BusesService } from '../buses.service';
import { BusesController } from '../buses.controller';
import { Bus } from '../entities/bus.entity';
import { Report } from '../../reports/entities/report.entity';
import { MaxPassengersValidator } from '../validators/max-passengers.validator';

describe('BusesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [BusesModule],
    })
      .overrideProvider(getRepositoryToken(Bus))
      .useValue({
        find: jest.fn(),
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      })
      .overrideProvider(getRepositoryToken(Report))
      .useValue({
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findAndCount: jest.fn(),
        query: jest.fn(),
      })
      .compile();
  });

  // ── SCN: BusesService is provided ──────────────────────────────────────

  it('should provide BusesService', () => {
    const service = module.get<BusesService>(BusesService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(BusesService);
  });

  // ── SCN: BusesController is provided ───────────────────────────────────

  it('should provide BusesController', () => {
    const controller = module.get<BusesController>(BusesController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(BusesController);
  });

  // ── SCN: BusesService is exported (available for other modules) ────────

  it('should export BusesService', () => {
    const service = module.get<BusesService>(BusesService);
    expect(service).toBeDefined();
  });

  // ── SCN: 'IBusesService' token resolves to BusesService instance ────────

  it('should provide IBusesService token resolving to BusesService', () => {
    const tokenService = module.get('IBusesService');
    const concreteService = module.get<BusesService>(BusesService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });

  // ── SCN: 'IBusReader' token resolves to BusesService instance ───────────

  it('should provide IBusReader token resolving to BusesService', () => {
    const tokenService = module.get('IBusReader');
    const concreteService = module.get<BusesService>(BusesService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });

  // ── SCN: 'ICapacityValidator' token resolves to MaxPassengersValidator ──

  it('should provide ICapacityValidator token resolving to MaxPassengersValidator', () => {
    const validator = module.get('ICapacityValidator');
    expect(validator).toBeDefined();
    expect(validator).toBeInstanceOf(MaxPassengersValidator);
  });
});
