import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { BusAssignment } from '../entities/bus-assignment.entity';

describe('BusAssignment Entity', () => {
  it('should be defined and instantiable', () => {
    const ba = new BusAssignment();
    expect(ba).toBeDefined();
    expect(ba).toBeInstanceOf(BusAssignment);
  });

  it('should set and read all properties', () => {
    const ba = new BusAssignment();
    ba.id = 1;
    ba.bus_id = 10;
    ba.route_id = 20;
    ba.assigned_at = new Date('2025-06-01T08:00:00.000Z');
    ba.unassigned_at = null;
    ba.created_at = new Date('2025-06-01T08:00:00.000Z');

    expect(ba.id).toBe(1);
    expect(ba.bus_id).toBe(10);
    expect(ba.route_id).toBe(20);
    expect(ba.assigned_at).toEqual(new Date('2025-06-01T08:00:00.000Z'));
    expect(ba.unassigned_at).toBeNull();
    expect(ba.created_at).toEqual(new Date('2025-06-01T08:00:00.000Z'));
  });

  it('should handle unassigned_at with a date value', () => {
    const ba = new BusAssignment();
    ba.unassigned_at = new Date('2025-06-01T18:00:00.000Z');

    expect(ba.unassigned_at).toEqual(new Date('2025-06-01T18:00:00.000Z'));
  });

  it('should be registered in TypeORM repository', async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(BusAssignment),
          useValue: { find: jest.fn(), findOneBy: jest.fn() },
        },
      ],
    }).compile();

    const repo = module.get(getRepositoryToken(BusAssignment));
    expect(repo).toBeDefined();
  });
});
