import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoutesModule } from '../routes.module';
import { RoutesService } from '../routes.service';
import { RoutesController } from '../routes.controller';
import { Route } from '../entities/route.entity';
import { RouteStop } from '../../route-stops/entities/route-stop.entity';

describe('RoutesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [RoutesModule],
    })
      .overrideProvider(getRepositoryToken(Route))
      .useValue({
        find: jest.fn(),
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
      })
      .overrideProvider(getRepositoryToken(RouteStop))
      .useValue({
        find: jest.fn(),
      })
      .compile();
  });

  it('should provide RoutesService', () => {
    const service = module.get<RoutesService>(RoutesService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(RoutesService);
  });

  it('should provide RoutesController', () => {
    const controller = module.get<RoutesController>(RoutesController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(RoutesController);
  });

  it('should export RoutesService', () => {
    const service = module.get<RoutesService>(RoutesService);
    expect(service).toBeDefined();
  });

  it('should provide IRoutesService token resolving to RoutesService', () => {
    const tokenService = module.get('IRoutesService');
    const concreteService = module.get<RoutesService>(RoutesService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });
});
