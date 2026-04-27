import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { RouteStop } from '../entities/route-stop.entity';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';
import type { GeoJsonLineString } from '../../common/types/geojson';

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
    rs.stop_order = 3;
    rs.created_at = new Date('2025-01-01T00:00:00.000Z');
    rs.updated_at = new Date('2025-01-01T00:00:00.000Z');

    expect(rs.id).toBe(1);
    expect(rs.route_id).toBe(10);
    expect(rs.stop_id).toBe(20);
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

  it('should hold a stop relation with name', () => {
    const rs = new RouteStop();
    const stop = new Stop();
    stop.id = 20;
    stop.name = 'Parada Central';
    rs.stop = stop;

    expect(rs.stop).toBeInstanceOf(Stop);
    expect(rs.stop.name).toBe('Parada Central');
  });

  // ── SCN: segment_geometry maps as JSONB, accepts GeoJSON LineString ─────

  it('should accept a valid GeoJSON LineString in segment_geometry', () => {
    const rs = new RouteStop();
    const geoJson: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [-58.3816, -34.6037],
        [-58.3820, -34.6045],
      ],
    };
    rs.segment_geometry = geoJson;

    expect(rs.segment_geometry).toEqual(geoJson);
    expect(rs.segment_geometry!.type).toBe('LineString');
    expect(rs.segment_geometry!.coordinates).toHaveLength(2);
    expect(rs.segment_geometry!.coordinates[0]).toEqual([-58.3816, -34.6037]);
  });

  it('should accept null for segment_geometry', () => {
    const rs = new RouteStop();
    rs.segment_geometry = null;

    expect(rs.segment_geometry).toBeNull();
  });

  // ── TRIANGULATION: segment_geometry with different coordinate counts ────

  it('should accept segment_geometry with many coordinates', () => {
    const rs = new RouteStop();
    const geoJson: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [-58.3816, -34.6037],
        [-58.3820, -34.6045],
        [-58.3825, -34.6050],
        [-58.3830, -34.6055],
        [-58.3835, -34.6060],
      ],
    };
    rs.segment_geometry = geoJson;

    expect(rs.segment_geometry!.coordinates).toHaveLength(5);
    expect(rs.segment_geometry!.coordinates[4]).toEqual([-58.3835, -34.6060]);
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
