import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DayTypesModule } from '../day-types.module';
import { DayTypesService } from '../day-types.service';
import { DayTypesController } from '../day-types.controller';
import { DayType } from '../entities/day-type.entity';

describe('DayTypesModule', () => {
  let module: any;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DayTypesModule],
    })
      .overrideProvider(getRepositoryToken(DayType))
      .useValue({
        find: jest.fn(),
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
      })
      .compile();
  });

  it('should provide DayTypesService', () => {
    const service = module.get<DayTypesService>(DayTypesService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(DayTypesService);
  });

  it('should provide DayTypesController', () => {
    const controller = module.get<DayTypesController>(DayTypesController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(DayTypesController);
  });

  it('should export DayTypesService', () => {
    const service = module.get<DayTypesService>(DayTypesService);
    expect(service).toBeDefined();
  });

  it('should provide IDayTypesService token resolving to DayTypesService', () => {
    const tokenService = module.get('IDayTypesService');
    const concreteService = module.get<DayTypesService>(DayTypesService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });
});
