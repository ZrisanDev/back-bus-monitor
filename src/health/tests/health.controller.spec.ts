import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';
import { SKIP_TRANSFORM_KEY } from '../../common/decorators/skip-transform.decorator';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            checkHealth: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  // ── SCN-401: GET /health returns 200 with health check result ───────

  it('should return health check result from service when DB is healthy', async () => {
    const healthResult = {
      status: 'ok' as const,
      database: 'connected' as const,
      kafka: 'disabled' as const,
      timestamp: new Date().toISOString(),
    };
    jest.spyOn(service, 'checkHealth').mockResolvedValue(healthResult);

    const result = await controller.check();

    expect(result).toEqual(healthResult);
    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  // ── SCN-402: When DB is down, returns 200 with degraded status ──────

  it('should return degraded status when database is down (still 200)', async () => {
    const degradedResult = {
      status: 'degraded' as const,
      database: 'disconnected' as const,
      kafka: 'disabled' as const,
      timestamp: new Date().toISOString(),
    };
    jest.spyOn(service, 'checkHealth').mockResolvedValue(degradedResult);

    const result = await controller.check();

    expect(result).toEqual(degradedResult);
    expect(result.status).toBe('degraded');
    expect(result.database).toBe('disconnected');
  });

  // ── Response includes status, database, timestamp fields ────────────

  it('should include status, database, and timestamp fields in response', async () => {
    const healthResult = {
      status: 'ok' as const,
      database: 'connected' as const,
      kafka: 'disabled' as const,
      timestamp: new Date().toISOString(),
    };
    jest.spyOn(service, 'checkHealth').mockResolvedValue(healthResult);

    const result = await controller.check();

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('database');
    expect(result).toHaveProperty('timestamp');
    expect(typeof result.status).toBe('string');
    expect(typeof result.database).toBe('string');
    expect(typeof result.timestamp).toBe('string');
  });

  // ── @SkipTransform() decorator applied ──────────────────────────────

  it('should have @SkipTransform() decorator on check method', () => {
    const reflector = new Reflector();
    const handler = controller.check;
    const skipTransform = reflector.get(SKIP_TRANSFORM_KEY, handler);

    expect(skipTransform).toBe(true);
  });

  // ── Triangulation: controller delegates to service ──────────────────

  it('should delegate to HealthService.checkHealth()', async () => {
    const healthResult = {
      status: 'ok' as const,
      database: 'connected' as const,
      kafka: 'disabled' as const,
      timestamp: new Date().toISOString(),
    };
    const spy = jest
      .spyOn(service, 'checkHealth')
      .mockResolvedValue(healthResult);

    await controller.check();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
