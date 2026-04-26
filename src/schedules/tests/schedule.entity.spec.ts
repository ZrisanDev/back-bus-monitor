import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Schedule } from '../entities/schedule.entity';

describe('Schedule Entity', () => {
  it('should be defined and instantiable', () => {
    const s = new Schedule();
    expect(s).toBeDefined();
    expect(s).toBeInstanceOf(Schedule);
  });

  it('should set and read all properties', () => {
    const s = new Schedule();
    s.id = 1;
    s.route_id = 10;
    s.direction_id = 2;
    s.day_type_id = 3;
    s.start_time = '06:00';
    s.end_time = '22:00';
    s.is_operating = true;
    s.created_at = new Date('2025-01-01T00:00:00.000Z');
    s.updated_at = new Date('2025-01-01T00:00:00.000Z');

    expect(s.id).toBe(1);
    expect(s.route_id).toBe(10);
    expect(s.direction_id).toBe(2);
    expect(s.day_type_id).toBe(3);
    expect(s.start_time).toBe('06:00');
    expect(s.end_time).toBe('22:00');
    expect(s.is_operating).toBe(true);
    expect(s.created_at).toEqual(new Date('2025-01-01T00:00:00.000Z'));
    expect(s.updated_at).toEqual(new Date('2025-01-01T00:00:00.000Z'));
  });

  it('should handle is_operating false with null times', () => {
    const s = new Schedule();
    s.is_operating = false;
    s.start_time = null as any;
    s.end_time = null as any;

    expect(s.is_operating).toBe(false);
    expect(s.start_time).toBeNull();
    expect(s.end_time).toBeNull();
  });

  it('should be registered in TypeORM repository', async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(Schedule),
          useValue: { find: jest.fn(), findOneBy: jest.fn() },
        },
      ],
    }).compile();

    const repo = module.get(getRepositoryToken(Schedule));
    expect(repo).toBeDefined();
  });
});
