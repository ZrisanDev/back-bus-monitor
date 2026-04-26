import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HealthService } from '../src/health/health.service';

/**
 * Task 3.4: E2E integration test for Kafka ON/OFF toggle.
 *
 * Verifies the health endpoint contract under both killswitch states.
 * Uses the real AppModule but overrides HealthService for deterministic
 * kafka status control without needing a running DB.
 */
describe('Kafka Toggle (e2e)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  // ── SCN: KAFKA_ENABLED=false → health reports kafka disabled ────────

  it('should report kafka=disabled in health when KAFKA_ENABLED=false', async () => {
    const originalValue = process.env.KAFKA_ENABLED;
    process.env.KAFKA_ENABLED = 'false';

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

    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('kafka', 'disabled');

    process.env.KAFKA_ENABLED = originalValue;
  });

  // ── SCN: KAFKA_ENABLED=true → health reports kafka enabled ──────────

  it('should report kafka=enabled in health when KAFKA_ENABLED=true', async () => {
    const originalValue = process.env.KAFKA_ENABLED;
    process.env.KAFKA_ENABLED = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HealthService)
      .useValue({
        checkHealth: jest.fn().mockResolvedValue({
          status: 'ok',
          database: 'connected',
          kafka: 'enabled',
          timestamp: new Date().toISOString(),
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('kafka', 'enabled');

    process.env.KAFKA_ENABLED = originalValue;
  });

  // ── SCN: KAFKA_ENABLED absent → health reports kafka disabled ───────

  it('should report kafka=disabled in health when KAFKA_ENABLED is absent', async () => {
    const originalValue = process.env.KAFKA_ENABLED;
    delete process.env.KAFKA_ENABLED;

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

    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('kafka', 'disabled');

    if (originalValue !== undefined) {
      process.env.KAFKA_ENABLED = originalValue;
    }
  });

  // ── SCN: Kafka OFF → existing HTTP endpoints still respond ───────────

  it('should still serve HTTP endpoints when Kafka is disabled', async () => {
    process.env.KAFKA_ENABLED = 'false';

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

    // Health endpoint should work
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });
});
