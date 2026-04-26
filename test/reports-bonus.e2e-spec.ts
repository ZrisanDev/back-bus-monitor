import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

/**
 * Task 5.1: E2E contract tests for Reports bonus features.
 *
 * Covers:
 * - GET /api/reports/buses/status → occupancy_percentage + filters
 * - GET /api/buses/:id/reports → paginated history + date range
 * - Error contracts: 400 invalid filter, 404 non-existent bus
 */

// ── Shared mock data ──────────────────────────────────────────────────

const MOCK_STATUS_ALL = [
  {
    bus_id: 1,
    bus_code: 'BUS-001',
    bus_capacity: 40,
    passenger_count: 40,
    timestamp: '2026-04-25T12:00:00.000Z',
    route_id: 1,
    route_name: 'Expreso 1',
    stop_id: 1,
    stop_name: 'Parada A',
    occupancy_percentage: 100.0,
  },
  {
    bus_id: 2,
    bus_code: 'BUS-002',
    bus_capacity: 40,
    passenger_count: 20,
    timestamp: '2026-04-25T12:00:00.000Z',
    route_id: 1,
    route_name: 'Expreso 1',
    stop_id: 2,
    stop_name: 'Parada B',
    occupancy_percentage: 50.0,
  },
  {
    bus_id: 3,
    bus_code: 'BUS-003',
    bus_capacity: 40,
    passenger_count: null,
    timestamp: null,
    route_id: null,
    route_name: null,
    stop_id: null,
    stop_name: null,
    occupancy_percentage: null,
  },
];

const MOCK_PAGINATED_REPORTS = {
  data: [
    {
      id: 1,
      bus_id: 1,
      passenger_count: 40,
      route_id: 1,
      stop_id: 1,
      latitude: -16.5,
      longitude: -68.15,
      timestamp: '2026-04-25T12:00:00.000Z',
    },
    {
      id: 2,
      bus_id: 1,
      passenger_count: 35,
      route_id: 1,
      stop_id: 2,
      latitude: -16.49,
      longitude: -68.14,
      timestamp: '2026-04-25T11:55:00.000Z',
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
};

describe('Reports Bonus E2E (e2e)', () => {
  let app: INestApplication<App>;

  const reportsServiceMock = {
    getLastStatusAll: jest.fn(),
    findReportsByBus: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('IReportsService')
      .useValue(reportsServiceMock)
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

  // ── GET /api/reports/buses/status ──────────────────────────────────

  describe('GET /api/reports/buses/status', () => {
    it('should return all buses with occupancy_percentage', async () => {
      reportsServiceMock.getLastStatusAll.mockResolvedValue(MOCK_STATUS_ALL);

      const res = await request(app.getHttpServer())
        .get('/api/reports/buses/status')
        .expect(200);

      // TransformInterceptor wraps response
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('statusCode', 200);
      expect(res.body.data).toHaveLength(3);

      // Verify occupancy_percentage is present and correct
      const bus1 = res.body.data.find((b: any) => b.bus_id === 1);
      expect(bus1.occupancy_percentage).toBe(100.0);

      const bus2 = res.body.data.find((b: any) => b.bus_id === 2);
      expect(bus2.occupancy_percentage).toBe(50.0);

      // Inactive bus: null occupancy
      const bus3 = res.body.data.find((b: any) => b.bus_id === 3);
      expect(bus3.occupancy_percentage).toBeNull();
    });

    it('should return only full buses with filter=full', async () => {
      const fullBuses = MOCK_STATUS_ALL.filter(
        (b) => b.passenger_count !== null && b.passenger_count >= b.bus_capacity,
      );
      reportsServiceMock.getLastStatusAll.mockResolvedValue(fullBuses);

      const res = await request(app.getHttpServer())
        .get('/api/reports/buses/status?filter=full')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].bus_id).toBe(1);
      expect(res.body.data[0].occupancy_percentage).toBe(100.0);
    });

    it('should return only active buses with filter=active', async () => {
      const activeBuses = MOCK_STATUS_ALL.filter(
        (b) => b.timestamp !== null,
      );
      reportsServiceMock.getLastStatusAll.mockResolvedValue(activeBuses);

      const res = await request(app.getHttpServer())
        .get('/api/reports/buses/status?filter=active')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(
        res.body.data.every((b: any) => b.timestamp !== null),
      ).toBe(true);
    });

    it('should return only inactive buses with filter=inactive', async () => {
      const inactiveBuses = MOCK_STATUS_ALL.filter(
        (b) => b.timestamp === null,
      );
      reportsServiceMock.getLastStatusAll.mockResolvedValue(inactiveBuses);

      const res = await request(app.getHttpServer())
        .get('/api/reports/buses/status?filter=inactive')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].bus_id).toBe(3);
    });

    it('should return 400 for invalid filter value', async () => {
      reportsServiceMock.getLastStatusAll.mockRejectedValue(
        new BadRequestException(
          'Invalid filter "invalid". Valid values: full, active, inactive',
        ),
      );

      const res = await request(app.getHttpServer())
        .get('/api/reports/buses/status?filter=invalid')
        .expect(400);

      expect(res.body).toHaveProperty('statusCode', 400);
      expect(res.body).toHaveProperty('message');
      expect(reportsServiceMock.getLastStatusAll).toHaveBeenCalledWith(
        'invalid',
      );
    });

    it('should pass filter query parameter to service', async () => {
      reportsServiceMock.getLastStatusAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/reports/buses/status?filter=full')
        .expect(200);

      expect(reportsServiceMock.getLastStatusAll).toHaveBeenCalledWith('full');
    });

    it('should pass undefined filter when no query param', async () => {
      reportsServiceMock.getLastStatusAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/reports/buses/status')
        .expect(200);

      expect(reportsServiceMock.getLastStatusAll).toHaveBeenCalledWith(
        undefined,
      );
    });
  });

  // ── GET /api/buses/:id/reports ─────────────────────────────────────

  describe('GET /api/buses/:id/reports', () => {
    it('should return paginated reports with metadata', async () => {
      reportsServiceMock.findReportsByBus.mockResolvedValue(
        MOCK_PAGINATED_REPORTS,
      );

      const res = await request(app.getHttpServer())
        .get('/api/buses/1/reports?page=1&limit=20')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.data).toHaveLength(2);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });

      // Verify report fields
      const report = res.body.data.data[0];
      expect(report).toHaveProperty('bus_id');
      expect(report).toHaveProperty('passenger_count');
      expect(report).toHaveProperty('latitude');
      expect(report).toHaveProperty('longitude');
      expect(report).toHaveProperty('timestamp');
    });

    it('should pass from/to date range params to service', async () => {
      reportsServiceMock.findReportsByBus.mockResolvedValue({
        data: [MOCK_PAGINATED_REPORTS.data[0]],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      await request(app.getHttpServer())
        .get(
          '/api/buses/1/reports?from=2026-04-25T00:00:00Z&to=2026-04-25T23:59:59Z',
        )
        .expect(200);

      expect(reportsServiceMock.findReportsByBus).toHaveBeenCalledWith(
        1,
        1,
        20,
        '2026-04-25T00:00:00Z',
        '2026-04-25T23:59:59Z',
      );
    });

    it('should return 404 for non-existent bus', async () => {
      reportsServiceMock.findReportsByBus.mockRejectedValue(
        new NotFoundException('Bus not found'),
      );

      const res = await request(app.getHttpServer())
        .get('/api/buses/99999/reports')
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('message');
    });

    it('should use default page=1 and limit=20 when not specified', async () => {
      reportsServiceMock.findReportsByBus.mockResolvedValue(
        MOCK_PAGINATED_REPORTS,
      );

      await request(app.getHttpServer())
        .get('/api/buses/1/reports')
        .expect(200);

      expect(reportsServiceMock.findReportsByBus).toHaveBeenCalledWith(
        1, 1, 20, undefined, undefined,
      );
    });

    it('should return reports ordered by timestamp DESC', async () => {
      reportsServiceMock.findReportsByBus.mockResolvedValue(
        MOCK_PAGINATED_REPORTS,
      );

      const res = await request(app.getHttpServer())
        .get('/api/buses/1/reports')
        .expect(200);

      const reports = res.body.data.data;
      // Verify service is called (ordering is handled by service)
      expect(reports[0].timestamp).toBe('2026-04-25T12:00:00.000Z');
      expect(reports[1].timestamp).toBe('2026-04-25T11:55:00.000Z');
    });
  });
});
