import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

/**
 * Task 5.1: E2E contract tests for Routes bonus features.
 *
 * Covers:
 * - GET /api/routes → list all routes
 * - GET /api/routes/:id/stops → ordered stops with coordinates
 * - GET /api/routes/:id/geojson → valid GeoJSON FeatureCollection
 * - Error contracts: 404 non-existent route
 */

// ── Shared mock data ──────────────────────────────────────────────────

const MOCK_ROUTES = [
  { id: 1, name: 'Expreso 1', created_at: '2026-04-25T00:00:00.000Z' },
  { id: 2, name: 'Expreso 2', created_at: '2026-04-25T00:00:00.000Z' },
];

const MOCK_ROUTE_STOPS = [
  {
    id: 1,
    name: 'Parada A',
    latitude: -16.5,
    longitude: -68.15,
    stop_order: 1,
    direction_id: 1,
  },
  {
    id: 2,
    name: 'Parada B',
    latitude: -16.49,
    longitude: -68.14,
    stop_order: 2,
    direction_id: 1,
  },
  {
    id: 3,
    name: 'Parada C',
    latitude: -16.48,
    longitude: -68.13,
    stop_order: 3,
    direction_id: 1,
  },
];

const MOCK_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { route_id: 1, route_name: 'Expreso 1' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-68.15, -16.5],
          [-68.14, -16.49],
          [-68.13, -16.48],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { stop_id: 1, name: 'Parada A', stop_order: 1 },
      geometry: { type: 'Point', coordinates: [-68.15, -16.5] },
    },
    {
      type: 'Feature',
      properties: { stop_id: 2, name: 'Parada B', stop_order: 2 },
      geometry: { type: 'Point', coordinates: [-68.14, -16.49] },
    },
    {
      type: 'Feature',
      properties: { stop_id: 3, name: 'Parada C', stop_order: 3 },
      geometry: { type: 'Point', coordinates: [-68.13, -16.48] },
    },
  ],
};

describe('Routes Bonus E2E (e2e)', () => {
  let app: INestApplication<App>;

  const routesServiceMock = {
    findAll: jest.fn(),
    findStopsByRoute: jest.fn(),
    findGeoJsonByRoute: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('IRoutesService')
      .useValue(routesServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/routes ────────────────────────────────────────────────

  describe('GET /api/routes', () => {
    it('should return a list of routes', async () => {
      routesServiceMock.findAll.mockResolvedValue(MOCK_ROUTES);

      const res = await request(app.getHttpServer())
        .get('/api/routes')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
    });
  });

  // ── GET /api/routes/:id/stops ──────────────────────────────────────

  describe('GET /api/routes/:id/stops', () => {
    it('should return ordered stops for a valid route', async () => {
      routesServiceMock.findStopsByRoute.mockResolvedValue(MOCK_ROUTE_STOPS);

      const res = await request(app.getHttpServer())
        .get('/api/routes/1/stops')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(3);

      // Verify stop fields
      const stop = res.body.data[0];
      expect(stop).toHaveProperty('id');
      expect(stop).toHaveProperty('name');
      expect(stop).toHaveProperty('latitude');
      expect(stop).toHaveProperty('longitude');
      expect(stop).toHaveProperty('stop_order');
      expect(stop).toHaveProperty('direction_id');

      // Verify ordering
      expect(res.body.data[0].stop_order).toBeLessThan(
        res.body.data[1].stop_order,
      );
    });

    it('should return 404 for non-existent route', async () => {
      routesServiceMock.findStopsByRoute.mockRejectedValue(
        new NotFoundException('Ruta con ID 99999 no encontrada'),
      );

      const res = await request(app.getHttpServer())
        .get('/api/routes/99999/stops')
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('message');
    });
  });

  // ── GET /api/routes/:id/geojson ────────────────────────────────────

  describe('GET /api/routes/:id/geojson', () => {
    it('should return valid GeoJSON FeatureCollection', async () => {
      routesServiceMock.findGeoJsonByRoute.mockResolvedValue(MOCK_GEOJSON);

      const res = await request(app.getHttpServer())
        .get('/api/routes/1/geojson')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      const geojson = res.body.data;

      // Top-level GeoJSON structure
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(4); // 1 LineString + 3 Points

      // LineString feature (first)
      const lineFeature = geojson.features[0];
      expect(lineFeature.type).toBe('Feature');
      expect(lineFeature.geometry.type).toBe('LineString');
      expect(lineFeature.geometry.coordinates).toHaveLength(3);

      // Coordinates must be [longitude, latitude]
      const firstCoord = lineFeature.geometry.coordinates[0];
      expect(firstCoord).toHaveLength(2);
      expect(typeof firstCoord[0]).toBe('number'); // longitude
      expect(typeof firstCoord[1]).toBe('number'); // latitude

      // Point features
      const pointFeature = geojson.features[1];
      expect(pointFeature.type).toBe('Feature');
      expect(pointFeature.geometry.type).toBe('Point');
      expect(pointFeature.geometry.coordinates).toHaveLength(2);

      // Properties must include route info on LineString
      expect(lineFeature.properties).toHaveProperty('route_id');
      expect(lineFeature.properties).toHaveProperty('route_name');

      // Properties must include stop info on Points
      expect(pointFeature.properties).toHaveProperty('stop_id');
      expect(pointFeature.properties).toHaveProperty('name');
    });

    it('should return 404 for non-existent route geojson', async () => {
      routesServiceMock.findGeoJsonByRoute.mockRejectedValue(
        new NotFoundException('Ruta con ID 99999 no encontrada'),
      );

      const res = await request(app.getHttpServer())
        .get('/api/routes/99999/geojson')
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('message');
    });

    it('should have coordinates in [longitude, latitude] order', async () => {
      routesServiceMock.findGeoJsonByRoute.mockResolvedValue(MOCK_GEOJSON);

      const res = await request(app.getHttpServer())
        .get('/api/routes/1/geojson')
        .expect(200);

      const lineFeature = res.body.data.features[0];
      for (const coord of lineFeature.geometry.coordinates) {
        // Longitude should be in typical Bolivia range [-80, -50]
        expect(coord[0]).toBeLessThan(0);
        expect(coord[0]).toBeGreaterThan(-80);
        // Latitude should be in typical Bolivia range [-25, 0]
        expect(coord[1]).toBeLessThan(0);
        expect(coord[1]).toBeGreaterThan(-25);
      }
    });

    it('should have Point features with stop properties', async () => {
      routesServiceMock.findGeoJsonByRoute.mockResolvedValue(MOCK_GEOJSON);

      const res = await request(app.getHttpServer())
        .get('/api/routes/1/geojson')
        .expect(200);

      const pointFeatures = res.body.data.features.filter(
        (f: any) => f.geometry.type === 'Point',
      );
      expect(pointFeatures).toHaveLength(3);

      // Each point should have stop properties
      for (const pf of pointFeatures) {
        expect(pf.properties).toHaveProperty('stop_id');
        expect(pf.properties).toHaveProperty('name');
        expect(pf.properties).toHaveProperty('stop_order');
        expect(pf.geometry.coordinates).toHaveLength(2);
      }
    });
  });
});
