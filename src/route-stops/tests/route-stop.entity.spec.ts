import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { RouteStop } from '../entities/route-stop.entity';

describe('RouteStop Entity', () => {
  it('should be defined and instantiable', () => {
    const rs = new RouteStop();
    expect(rs).toBeDefined();
    expect(rs).toBeInstanceOf(RouteStop);
  });

  it('should set and read all properties', () => {
    const rs = new RouteStop();
    rs.id = 1;
    rs.route_id = 10;
    rs.stop_id = 20;
    rs.direction_id = 2;
    rs.stop_order = 3;
    rs.created_at = new Date('2025-01-01T00:00:00.000Z');
    rs.updated_at = new Date('2025-01-01T00:00:00.000Z');

    expect(rs.id).toBe(1);
    expect(rs.route_id).toBe(10);
    expect(rs.stop_id).toBe(20);
    expect(rs.direction_id).toBe(2);
    expect(rs.stop_order).toBe(3);
    expect(rs.created_at).toEqual(new Date('2025-01-01T00:00:00.000Z'));
    expect(rs.updated_at).toEqual(new Date('2025-01-01T00:00:00.000Z'));
  });

  it('should be registered in TypeORM repository', async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(RouteStop),
          useValue: { find: jest.fn(), findOneBy: jest.fn() },
        },
      ],
    }).compile();

    const repo = module.get(getRepositoryToken(RouteStop));
    expect(repo).toBeDefined();
  });
});
