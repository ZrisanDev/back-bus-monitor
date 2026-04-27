import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusAssignmentsModule } from '../bus-assignments.module';
import { BusAssignmentsService } from '../bus-assignments.service';
import { BusAssignmentsController, BusActiveAssignmentController } from '../bus-assignments.controller';
import { BusAssignment } from '../entities/bus-assignment.entity';

describe('BusAssignmentsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [BusAssignmentsModule],
    })
      .overrideProvider(getRepositoryToken(BusAssignment))
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

  it('should provide BusAssignmentsService', () => {
    const service = module.get<BusAssignmentsService>(BusAssignmentsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(BusAssignmentsService);
  });

  it('should provide BusAssignmentsController', () => {
    const controller = module.get<BusAssignmentsController>(BusAssignmentsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(BusAssignmentsController);
  });

  it('should provide BusActiveAssignmentController', () => {
    const controller = module.get<BusActiveAssignmentController>(BusActiveAssignmentController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(BusActiveAssignmentController);
  });

  it('should export BusAssignmentsService', () => {
    const service = module.get<BusAssignmentsService>(BusAssignmentsService);
    expect(service).toBeDefined();
  });

  it('should provide IBusAssignmentsService token resolving to BusAssignmentsService', () => {
    const tokenService = module.get('IBusAssignmentsService');
    const concreteService = module.get<BusAssignmentsService>(BusAssignmentsService);
    expect(tokenService).toBeDefined();
    expect(tokenService).toBe(concreteService);
  });
});
