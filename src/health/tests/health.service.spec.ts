import { HealthService } from '../health.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockDataSource: { query: jest.Mock };

  beforeEach(() => {
    mockDataSource = { query: jest.fn() };
    service = new HealthService(mockDataSource as any);
  });

  // ── SCN-401: App healthy + DB reachable → ok/connected ──────────────

  it('should return ok status when database is reachable', async () => {
    mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.checkHealth();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  // ── SCN-402: App healthy + DB unreachable → degraded/disconnected ───

  it('should return degraded status when database query fails', async () => {
    mockDataSource.query.mockRejectedValue(new Error('Connection refused'));

    const result = await service.checkHealth();

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('disconnected');
    expect(result.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  // ── SCN-403: DB query throws error → caught gracefully ──────────────

  it('should catch query errors gracefully without throwing', async () => {
    mockDataSource.query.mockRejectedValue(
      new Error('ECONNREFUSED 127.0.0.1:5432'),
    );

    // checkHealth should resolve (not reject) even on DB failure
    const result = await service.checkHealth();

    expect(result).toEqual(
      expect.objectContaining({
        status: 'degraded',
        database: 'disconnected',
      }),
    );
  });

  // ── SCN-404: Database field has appropriate status string ───────────

  it('should include correct database status string for each state', async () => {
    // Connected state
    mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    const healthy = await service.checkHealth();
    expect(healthy.database).toBe('connected');

    // Disconnected state
    mockDataSource.query.mockRejectedValue(new Error('timeout'));
    const unhealthy = await service.checkHealth();
    expect(unhealthy.database).toBe('disconnected');
  });

  // ── Triangulation: timestamp is within valid time window ────────────

  it('should produce a timestamp within the current time window', async () => {
    const before = new Date().toISOString();
    mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.checkHealth();

    const after = new Date().toISOString();
    expect(new Date(result.timestamp).getTime()).toBeGreaterThanOrEqual(
      new Date(before).getTime(),
    );
    expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(
      new Date(after).getTime(),
    );
  });
});
