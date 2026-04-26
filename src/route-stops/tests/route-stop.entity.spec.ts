import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { RouteStop } from '../entities/route-stop.entity';
import { Route } from '../../routes/entities/route.entity';
import { Direction } from '../../directions/entities/direction.entity';
import { Stop } from '../../stops/entities/stop.entity';

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

  it('should hold a route relation with name', () => {
    const rs = new RouteStop();
    const route = new Route();
    route.id = 10;
    route.name = 'Expreso 1';
    rs.route = route;

    expect(rs.route).toBeInstanceOf(Route);
    expect(rs.route.name).toBe('Expreso 1');
  });

  it('should hold a direction relation with code', () => {
    const rs = new RouteStop();
    const dir = new Direction();
    dir.id = 2;
    dir.code = 'IDA';
    rs.direction = dir;

    expect(rs.direction).toBeInstanceOf(Direction);
    expect(rs.direction.code).toBe('IDA');
  });

  it('should hold a stop relation with name', () => {
    const rs = new RouteStop();
    const stop = new Stop();
    stop.id = 20;
    stop.name = 'Parada Central';
    rs.stop = stop;

    expect(rs.stop).toBeInstanceOf(Stop);
    expect(rs.stop.name).toBe('Parada Central');
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
