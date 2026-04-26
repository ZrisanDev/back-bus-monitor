import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StopsModule } from '../stops.module';
import { StopsService } from '../stops.service';
import { StopsController } from '../stops.controller';
import { Stop } from '../entities/stop.entity';

describe('StopsModule', () => {
  let module: any;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [StopsModule],
    })
      .overrideProvider(getRepositoryToken(Stop))
      .useValue({
        find: jest.fn(),
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
      })
      .compile();
  });

  it('should provide StopsService', () => {
    const service = module.get<StopsService>(StopsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(StopsService);
  });

  it('should provide StopsController', () => {
    const controller = module.get<StopsController>(StopsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(StopsController);
  });

  it('should export StopsService', () => {
    const service = module.get<StopsService>(StopsService);
    expect(service).toBeDefined();
  });

  it('should provide IStopsService token resolving to StopsService', () => {
    const tokenService = module.get('IStopsService');
    const concreteService = module.get<StopsService>(StopsService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });
});
