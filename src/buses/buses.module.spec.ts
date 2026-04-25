import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusesModule } from './buses.module';
import { BusesService } from './buses.service';
import { BusesController } from './buses.controller';
import { Bus } from './entities/bus.entity';

describe('BusesModule', () => {
  let module: any;

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
});
