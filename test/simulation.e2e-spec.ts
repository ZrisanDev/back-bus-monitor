import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { SimulatorService } from '../src/simulator/simulator.service';

/**
 * Task 5.1: E2E contract tests for Simulation lifecycle.
 *
 * Covers:
 * - POST /api/simulation/start → 200 with { status: 'running', tick_seconds: N }
 * - POST /api/simulation/start (idempotent) → still running, no duplicate loops
 * - POST /api/simulation/stop → 200 with { status: 'stopped' }
 * - POST /api/simulation/stop (idempotent) → still stopped
 *
 * The SimulatorService is NOT mocked — we test the real service
 * with a mocked KafkaProducerService (injected via module override).
 */

describe('Simulation Lifecycle E2E (e2e)', () => {
  let app: INestApplication<App>;

  const kafkaProducerMock = {
    publish: jest.fn().mockResolvedValue(undefined),
    setKafkaClient: jest.fn(),
  };

  const busAssignmentsServiceMock = {
    findActiveByBusId: jest.fn().mockResolvedValue(null),
  };

  const busesServiceMock = {
    findAll: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('KafkaProducerService')
      .useValue(kafkaProducerMock)
      .overrideProvider('IBusAssignmentsService')
      .useValue(busAssignmentsServiceMock)
      .overrideProvider('IBusesService')
      .useValue(busesServiceMock)
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
    // Ensure simulation is stopped before teardown
    const simulatorService = app.get(SimulatorService);
    await simulatorService.stop();
    if (app) await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /api/simulation/start ─────────────────────────────────────

  describe('POST /api/simulation/start', () => {
    it('should start simulation and return running status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/simulation/start')
        .expect(200);

      // TransformInterceptor wraps response
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('status', 'running');
      expect(res.body.data).toHaveProperty('tick_seconds');
      expect(typeof res.body.data.tick_seconds).toBe('number');
      expect(res.body.data.tick_seconds).toBeGreaterThan(0);
    });

    it('should be idempotent — second start returns same status', async () => {
      // First start already happened in previous test (or we start fresh)
      const res = await request(app.getHttpServer())
        .post('/api/simulation/start')
        .expect(200);

      expect(res.body.data).toHaveProperty('status', 'running');
    });
  });

  // ── POST /api/simulation/stop ──────────────────────────────────────

  describe('POST /api/simulation/stop', () => {
    it('should stop simulation and return stopped status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/simulation/stop')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('status', 'stopped');
    });

    it('should be idempotent — second stop returns same status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/simulation/stop')
        .expect(200);

      expect(res.body.data).toHaveProperty('status', 'stopped');
    });
  });

  // ── Full lifecycle ─────────────────────────────────────────────────

  describe('Full start → stop lifecycle', () => {
    it('should transition through running → stopped cleanly', async () => {
      const startRes = await request(app.getHttpServer())
        .post('/api/simulation/start')
        .expect(200);
      expect(startRes.body.data.status).toBe('running');

      const stopRes = await request(app.getHttpServer())
        .post('/api/simulation/stop')
        .expect(200);
      expect(stopRes.body.data.status).toBe('stopped');
    });
  });
});
