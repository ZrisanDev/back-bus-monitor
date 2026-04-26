import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoutesModule } from '../routes.module';
import { RoutesService } from '../routes.service';
import { RoutesController } from '../routes.controller';
import { Route } from '../entities/route.entity';

describe('RoutesModule', () => {
  let module: any;

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
