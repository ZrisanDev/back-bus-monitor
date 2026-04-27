import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { BusAssignmentsService } from '../bus-assignments.service';
import { BusAssignment } from '../entities/bus-assignment.entity';
import { CreateBusAssignmentDto } from '../dto/create-bus-assignment.dto';
import { UpdateBusAssignmentDto } from '../dto/update-bus-assignment.dto';

describe('BusAssignmentsService', () => {
  let service: BusAssignmentsService;
  let mockRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    merge: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      merge: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusAssignmentsService,
        {
          provide: getRepositoryToken(BusAssignment),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BusAssignmentsService>(BusAssignmentsService);
  });

  // ── Helper ───────────────────────────────────────────────────────────────

  const makeAssignment = (overrides: Partial<BusAssignment> = {}): BusAssignment => ({
    id: 1,
    bus_id: 10,
    route_id: 20,
    assigned_at: new Date('2025-06-01T08:00:00.000Z'),
    unassigned_at: null,
    created_at: new Date('2025-06-01T08:00:00.000Z'),
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all assignments', async () => {
      const assignments = [
        makeAssignment({ id: 1 }),
        makeAssignment({ id: 2, bus_id: 11 }),
      ];
      mockRepository.find.mockResolvedValue(assignments);

      const result = await service.findAll();

      expect(result).toEqual(assignments);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no assignments exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should filter by bus_id when provided', async () => {
      const filtered = [makeAssignment({ id: 1, bus_id: 10 })];
      mockRepository.find.mockResolvedValue(filtered);

      const result = await service.findAll({ bus_id: 10 });

      expect(result).toEqual(filtered);
      expect(mockRepository.find).toHaveBeenCalled();
    });

    it('should filter by route_id when provided', async () => {
      const filtered = [makeAssignment({ id: 1, route_id: 20 })];
      mockRepository.find.mockResolvedValue(filtered);

      const result = await service.findAll({ route_id: 20 });

      expect(result).toEqual(filtered);
    });

    it('should filter active_only=true to return only unassigned_at IS NULL', async () => {
      const active = [makeAssignment({ id: 1, unassigned_at: null })];
      mockRepository.find.mockResolvedValue(active);

      const result = await service.findAll({ active_only: true });

      expect(result).toEqual(active);
      expect(result).toHaveLength(1);
    });

    it('should return historical assignments when active_only is not set', async () => {
      const all = [
        makeAssignment({ id: 1, unassigned_at: null }),
        makeAssignment({ id: 2, unassigned_at: new Date('2025-06-01T18:00:00.000Z') }),
      ];
      mockRepository.find.mockResolvedValue(all);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findOne
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return assignment when id exists', async () => {
      const assignment = makeAssignment({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(assignment);

      const result = await service.findOne(1);

      expect(result).toEqual(assignment);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return correct assignment for different id', async () => {
      const assignment = makeAssignment({ id: 42, bus_id: 99 });
      mockRepository.findOneBy.mockResolvedValue(assignment);

      const result = await service.findOne(42);

      expect(result.id).toBe(42);
      expect(result.bus_id).toBe(99);
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with descriptive message including id', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      try {
        await service.findOne(999);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).getStatus()).toBe(404);
        expect((error as NotFoundException).message).toMatch(/999/);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // create
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    const dto: CreateBusAssignmentDto = {
      bus_id: 10,
      route_id: 20,
    };

    it('should create and return a new assignment', async () => {
      // No active assignment for this bus
      mockRepository.findOneBy.mockResolvedValue(null);
      const assignment = makeAssignment();
      mockRepository.create.mockReturnValue(assignment);
      mockRepository.save.mockResolvedValue(assignment);

      const result = await service.create(dto);

      expect(result).toEqual(assignment);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(assignment);
    });

    it('should create an assignment with different bus and route', async () => {
      const otherDto: CreateBusAssignmentDto = { bus_id: 5, route_id: 7 };
      mockRepository.findOneBy.mockResolvedValue(null);
      const assignment = makeAssignment({ bus_id: 5, route_id: 7 });
      mockRepository.create.mockReturnValue(assignment);
      mockRepository.save.mockResolvedValue(assignment);

      const result = await service.create(otherDto);

      expect(result.bus_id).toBe(5);
      expect(result.route_id).toBe(7);
    });

    it('should throw ConflictException when bus already has active assignment', async () => {
      const existingActive = makeAssignment({ id: 5, bus_id: 10, route_id: 30 });
      mockRepository.findOneBy.mockResolvedValue(existingActive);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with 409 status for active assignment conflict', async () => {
      const existingActive = makeAssignment({ id: 5, bus_id: 10, route_id: 30 });
      mockRepository.findOneBy.mockResolvedValue(existingActive);

      try {
        await service.create(dto);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getStatus()).toBe(409);
        expect((error as ConflictException).message).toMatch(/30/);
      }
    });

    it('should not call save when bus already has active assignment', async () => {
      const existingActive = makeAssignment({ id: 5, bus_id: 10, route_id: 30 });
      mockRepository.findOneBy.mockResolvedValue(existingActive);

      await expect(service.create(dto)).rejects.toThrow();
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should allow creating assignment after previous one is unassigned', async () => {
      // No active assignment (all previous are closed)
      mockRepository.findOneBy.mockResolvedValue(null);
      const assignment = makeAssignment();
      mockRepository.create.mockReturnValue(assignment);
      mockRepository.save.mockResolvedValue(assignment);

      const result = await service.create(dto);

      expect(result).toEqual(assignment);
    });

    it('should set assigned_at to current time when creating', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      const assignment = makeAssignment();
      mockRepository.create.mockReturnValue(assignment);
      mockRepository.save.mockImplementation(async (a) => a);

      await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ assigned_at: expect.any(Date) }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // update
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update and return the assignment', async () => {
      const existing = makeAssignment();
      const updated = { ...existing, route_id: 25 };
      mockRepository.findOneBy.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, { route_id: 25 });

      expect(result.route_id).toBe(25);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, { route_id: 25 })).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // unassign
  // ═══════════════════════════════════════════════════════════════════════════

  describe('unassign', () => {
    it('should set unassigned_at to NOW on an active assignment', async () => {
      const active = makeAssignment({ id: 1, unassigned_at: null });
      mockRepository.findOneBy.mockResolvedValue(active);
      const closed = { ...active, unassigned_at: new Date('2025-06-01T18:00:00.000Z') };
      mockRepository.save.mockResolvedValue(closed);

      const result = await service.unassign(1);

      expect(result.unassigned_at).toBeDefined();
      expect(result.unassigned_at).not.toBeNull();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.unassign(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when assignment is already unassigned', async () => {
      const inactive = makeAssignment({
        id: 1,
        unassigned_at: new Date('2025-06-01T18:00:00.000Z'),
      });
      mockRepository.findOneBy.mockResolvedValue(inactive);

      await expect(service.unassign(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with descriptive message including id', async () => {
      const inactive = makeAssignment({
        id: 5,
        unassigned_at: new Date('2025-06-01T18:00:00.000Z'),
      });
      mockRepository.findOneBy.mockResolvedValue(inactive);

      try {
        await service.unassign(5);
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getStatus()).toBe(400);
        expect((error as BadRequestException).message).toMatch(/5/);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findActiveByBusId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findActiveByBusId', () => {
    it('should return active assignment for a bus', async () => {
      const active = makeAssignment({ bus_id: 10, unassigned_at: null });
      mockRepository.findOneBy.mockResolvedValue(active);

      const result = await service.findActiveByBusId(10);

      expect(result).toEqual(active);
      expect(result!.unassigned_at).toBeNull();
    });

    it('should return null when bus has no active assignment', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findActiveByBusId(10);

      expect(result).toBeNull();
    });

    it('should query with correct bus_id and unassigned_at IS NULL', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await service.findActiveByBusId(42);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        bus_id: 42,
        unassigned_at: null,
      });
    });

    it('should return different assignments for different bus ids', async () => {
      const active42 = makeAssignment({ bus_id: 42, route_id: 5 });
      mockRepository.findOneBy.mockResolvedValue(active42);

      const result = await service.findActiveByBusId(42);

      expect(result!.bus_id).toBe(42);
      expect(result!.route_id).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // remove
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove and return the assignment', async () => {
      const assignment = makeAssignment();
      mockRepository.findOneBy.mockResolvedValue(assignment);
      mockRepository.remove.mockResolvedValue(assignment);

      const result = await service.remove(1);

      expect(result).toEqual(assignment);
      expect(mockRepository.remove).toHaveBeenCalledWith(assignment);
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
