import { Test, TestingModule } from '@nestjs/testing';
import { BusAssignmentsController, BusActiveAssignmentController } from '../bus-assignments.controller';
import { CreateBusAssignmentDto } from '../dto/create-bus-assignment.dto';
import { UpdateBusAssignmentDto } from '../dto/update-bus-assignment.dto';
import { BusAssignment } from '../entities/bus-assignment.entity';

describe('BusAssignmentsController', () => {
  let controller: BusAssignmentsController;
  let service: any;

  const makeAssignment = (overrides: Partial<BusAssignment> = {}): BusAssignment => ({
    id: 1,
    bus_id: 10,
    route_id: 20,
    assigned_at: new Date('2025-06-01T08:00:00.000Z'),
    unassigned_at: null,
    created_at: new Date('2025-06-01T08:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusAssignmentsController],
      providers: [
        {
          provide: 'IBusAssignmentsService',
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            unassign: jest.fn(),
            findActiveByBusId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BusAssignmentsController>(BusAssignmentsController);
    service = module.get('IBusAssignmentsService');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /bus-assignments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should call service.create with DTO and return result', async () => {
      const dto: CreateBusAssignmentDto = { bus_id: 10, route_id: 20 };
      const assignment = makeAssignment();
      jest.spyOn(service, 'create').mockResolvedValue(assignment);

      const result = await controller.create(dto);

      expect(result).toEqual(assignment);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should pass different DTO values to service', async () => {
      const dto: CreateBusAssignmentDto = { bus_id: 5, route_id: 7 };
      const assignment = makeAssignment({ bus_id: 5, route_id: 7 });
      jest.spyOn(service, 'create').mockResolvedValue(assignment);

      const result = await controller.create(dto);

      expect(result.bus_id).toBe(5);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /bus-assignments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all assignments from service', async () => {
      const assignments = [
        makeAssignment({ id: 1 }),
        makeAssignment({ id: 2, bus_id: 11 }),
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(assignments);

      const result = await controller.findAll();

      expect(result).toEqual(assignments);
      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no assignments exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });

    it('should pass query parameters to service', async () => {
      const filtered = [makeAssignment({ id: 1, bus_id: 10 })];
      jest.spyOn(service, 'findAll').mockResolvedValue(filtered);

      const result = await controller.findAll('10', undefined, 'true');

      expect(service.findAll).toHaveBeenCalledWith({ bus_id: 10, active_only: true });
    });

    it('should pass all query parameters to service', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      await controller.findAll('10', '20', 'true');

      expect(service.findAll).toHaveBeenCalledWith({ bus_id: 10, route_id: 20, active_only: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /bus-assignments/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return assignment by id', async () => {
      const assignment = makeAssignment({ id: 1 });
      jest.spyOn(service, 'findOne').mockResolvedValue(assignment);

      const result = await controller.findOne('1');

      expect(result).toEqual(assignment);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should return different assignment by id', async () => {
      const assignment = makeAssignment({ id: 42, bus_id: 99 });
      jest.spyOn(service, 'findOne').mockResolvedValue(assignment);

      const result = await controller.findOne('42');

      expect(result.id).toBe(42);
      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /bus-assignments/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto: UpdateBusAssignmentDto = { route_id: 25 };
      const updated = makeAssignment({ route_id: 25 });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('should call service.update with different id and dto', async () => {
      const dto: UpdateBusAssignmentDto = { route_id: 50 };
      const updated = makeAssignment({ id: 5, route_id: 50 });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('5', dto);

      expect(service.update).toHaveBeenCalledWith(5, dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /bus-assignments/:id/unassign
  // ═══════════════════════════════════════════════════════════════════════════

  describe('unassign', () => {
    it('should call service.unassign and return result', async () => {
      const closed = makeAssignment({ unassigned_at: new Date('2025-06-01T18:00:00.000Z') });
      jest.spyOn(service, 'unassign').mockResolvedValue(closed);

      const result = await controller.unassign('1');

      expect(result).toEqual(closed);
      expect(service.unassign).toHaveBeenCalledWith(1);
    });

    it('should call service.unassign with different id', async () => {
      const closed = makeAssignment({ id: 3, unassigned_at: new Date('2025-06-02T12:00:00.000Z') });
      jest.spyOn(service, 'unassign').mockResolvedValue(closed);

      const result = await controller.unassign('3');

      expect(service.unassign).toHaveBeenCalledWith(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /bus-assignments/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      const assignment = makeAssignment();
      jest.spyOn(service, 'remove').mockResolvedValue(assignment);

      const result = await controller.remove('1');

      expect(result).toEqual(assignment);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should call service.remove with different id', async () => {
      const assignment = makeAssignment({ id: 3 });
      jest.spyOn(service, 'remove').mockResolvedValue(assignment);

      await controller.remove('3');

      expect(service.remove).toHaveBeenCalledWith(3);
    });
  });
});

describe('BusActiveAssignmentController', () => {
  let controller: BusActiveAssignmentController;
  let service: any;

  const makeAssignment = (overrides: Partial<BusAssignment> = {}): BusAssignment => ({
    id: 1,
    bus_id: 10,
    route_id: 20,
    assigned_at: new Date('2025-06-01T08:00:00.000Z'),
    unassigned_at: null,
    created_at: new Date('2025-06-01T08:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusActiveAssignmentController],
      providers: [
        {
          provide: 'IBusAssignmentsService',
          useValue: {
            findActiveByBusId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BusActiveAssignmentController>(BusActiveAssignmentController);
    service = module.get('IBusAssignmentsService');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /buses/:busId/active-assignment
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findActiveByBusId', () => {
    it('should return active assignment for a bus', async () => {
      const active = makeAssignment({ bus_id: 10, unassigned_at: null });
      jest.spyOn(service, 'findActiveByBusId').mockResolvedValue(active);

      const result = await controller.findActiveByBusId('10');

      expect(result).toEqual(active);
      expect(service.findActiveByBusId).toHaveBeenCalledWith(10);
    });

    it('should return null when bus has no active assignment', async () => {
      jest.spyOn(service, 'findActiveByBusId').mockResolvedValue(null);

      const result = await controller.findActiveByBusId('10');

      expect(result).toBeNull();
    });

    it('should handle different bus ids', async () => {
      const active = makeAssignment({ bus_id: 42 });
      jest.spyOn(service, 'findActiveByBusId').mockResolvedValue(active);

      const result = await controller.findActiveByBusId('42');

      expect(service.findActiveByBusId).toHaveBeenCalledWith(42);
    });
  });
});
