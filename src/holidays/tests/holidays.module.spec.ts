import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HolidaysModule } from '../holidays.module';
import { HolidaysService } from '../holidays.service';
import { HolidaysController } from '../holidays.controller';
import { Holiday } from '../entities/holiday.entity';

describe('HolidaysModule', () => {
  let module: any;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [HolidaysModule],
    })
      .overrideProvider(getRepositoryToken(Holiday))
      .useValue({
        find: jest.fn(),
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        merge: jest.fn(),
      })
      .compile();
  });

  it('should provide HolidaysService', () => {
    const service = module.get<HolidaysService>(HolidaysService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(HolidaysService);
  });

  it('should provide HolidaysController', () => {
    const controller = module.get<HolidaysController>(HolidaysController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(HolidaysController);
  });

  it('should export HolidaysService', () => {
    const service = module.get<HolidaysService>(HolidaysService);
    expect(service).toBeDefined();
  });

  it('should provide IHolidaysService token resolving to HolidaysService', () => {
    const tokenService = module.get('IHolidaysService');
    const concreteService = module.get<HolidaysService>(HolidaysService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });
});
