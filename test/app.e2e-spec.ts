import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HealthService } from '../src/health/health.service';

/**
 * Task 5.1: Smoke test — app boots and serves health endpoint.
 * Updated to use /api/health since app uses global prefix 'api'.
 * HealthService is overridden to avoid DB dependency.
 */
describe('App smoke test (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HealthService)
      .useValue({
        checkHealth: jest.fn().mockResolvedValue({
          status: 'ok',
          database: 'connected',
          kafka: 'disabled',
          timestamp: new Date().toISOString(),
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('GET /api/health should return 200', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
  });
});
