import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DirectionsModule } from '../directions.module';
import { DirectionsService } from '../directions.service';
import { DirectionsController } from '../directions.controller';
import { Direction } from '../entities/direction.entity';

describe('DirectionsModule', () => {
  let module: any;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DirectionsModule],
    })
      .overrideProvider(getRepositoryToken(Direction))
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

  it('should provide DirectionsService', () => {
    const service = module.get<DirectionsService>(DirectionsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(DirectionsService);
  });

  it('should provide DirectionsController', () => {
    const controller = module.get<DirectionsController>(DirectionsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(DirectionsController);
  });

  it('should export DirectionsService', () => {
    const service = module.get<DirectionsService>(DirectionsService);
    expect(service).toBeDefined();
  });

  it('should provide IDirectionsService token resolving to DirectionsService', () => {
    const tokenService = module.get('IDirectionsService');
    const concreteService = module.get<DirectionsService>(DirectionsService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });
});
