import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RouteStopsModule } from '../route-stops.module';
import { RouteStopsService } from '../route-stops.service';
import { RouteStopsController } from '../route-stops.controller';
import { RouteStop } from '../entities/route-stop.entity';

describe('RouteStopsModule', () => {
  let module: any;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [RouteStopsModule],
    })
      .overrideProvider(getRepositoryToken(RouteStop))
      .useValue({
        find: jest.fn(),
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        merge: jest.fn(),
        count: jest.fn(),
        query: jest.fn(),
      })
      .compile();
  });

  it('should provide RouteStopsService', () => {
    const service = module.get<RouteStopsService>(RouteStopsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(RouteStopsService);
  });

  it('should provide RouteStopsController', () => {
    const controller = module.get<RouteStopsController>(RouteStopsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(RouteStopsController);
  });

  it('should export RouteStopsService', () => {
    const service = module.get<RouteStopsService>(RouteStopsService);
    expect(service).toBeDefined();
  });

  it('should provide IRouteStopsService token resolving to RouteStopsService', () => {
    const tokenService = module.get('IRouteStopsService');
    const concreteService = module.get<RouteStopsService>(RouteStopsService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });
});
