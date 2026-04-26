import { resolveKafkaConfig } from '../kafka.config';

describe('resolveKafkaConfig', () => {
  // ── SCN: KAFKA_ENABLED=true → enabled config with brokers ───────────

  it('should return enabled config when KAFKA_ENABLED is true', () => {
    const config = resolveKafkaConfig({
      KAFKA_ENABLED: 'true',
      KAFKA_BROKERS: 'kafka:29092',
    });

    expect(config.enabled).toBe(true);
    expect(config.brokers).toEqual(['kafka:29092']);
  });

  // ── SCN: KAFKA_ENABLED=false → disabled config ──────────────────────

  it('should return disabled config when KAFKA_ENABLED is false', () => {
    const config = resolveKafkaConfig({
      KAFKA_ENABLED: 'false',
      KAFKA_BROKERS: 'kafka:29092',
    });

    expect(config.enabled).toBe(false);
  });

  // ── SCN: KAFKA_ENABLED absent → disabled (safe default) ─────────────

  it('should default to disabled when KAFKA_ENABLED is absent', () => {
    const config = resolveKafkaConfig({
      KAFKA_BROKERS: 'kafka:29092',
    });

    expect(config.enabled).toBe(false);
  });

  // ── SCN: KAFKA_BROKERS default → localhost:9092 ─────────────────────

  it('should default brokers to localhost:9092 when KAFKA_BROKERS is absent', () => {
    const config = resolveKafkaConfig({ KAFKA_ENABLED: 'true' });

    expect(config.brokers).toEqual(['localhost:9092']);
  });

  // ── SCN: Multiple brokers → split correctly ─────────────────────────

  it('should split comma-separated brokers', () => {
    const config = resolveKafkaConfig({
      KAFKA_ENABLED: 'true',
      KAFKA_BROKERS: 'broker1:9092,broker2:9092,broker3:9092',
    });

    expect(config.brokers).toEqual([
      'broker1:9092',
      'broker2:9092',
      'broker3:9092',
    ]);
  });

  // ── SCN: clientId from env ──────────────────────────────────────────

  it('should use provided KAFKA_CLIENT_ID', () => {
    const config = resolveKafkaConfig({
      KAFKA_ENABLED: 'true',
      KAFKA_CLIENT_ID: 'custom-client',
    });

    expect(config.clientId).toBe('custom-client');
  });

  // ── SCN: clientId default → bus-monitor ─────────────────────────────

  it('should default clientId to bus-monitor', () => {
    const config = resolveKafkaConfig({ KAFKA_ENABLED: 'true' });

    expect(config.clientId).toBe('bus-monitor');
  });

  // ── SCN: groupId from env ───────────────────────────────────────────

  it('should use provided KAFKA_GROUP_ID', () => {
    const config = resolveKafkaConfig({
      KAFKA_ENABLED: 'true',
      KAFKA_GROUP_ID: 'custom-group',
    });

    expect(config.groupId).toBe('custom-group');
  });

  // ── SCN: groupId default → bus-monitor-group ────────────────────────

  it('should default groupId to bus-monitor-group', () => {
    const config = resolveKafkaConfig({ KAFKA_ENABLED: 'true' });

    expect(config.groupId).toBe('bus-monitor-group');
  });

  // ── SCN: KAFKA_ENABLED with random string → disabled (safe) ─────────

  it('should treat any non-"true" value as disabled', () => {
    const config = resolveKafkaConfig({
      KAFKA_ENABLED: 'yes',
    });

    expect(config.enabled).toBe(false);
  });

  // ── SCN: Disabled config still has brokers for health check ──────────

  it('should still resolve brokers when disabled', () => {
    const config = resolveKafkaConfig({
      KAFKA_ENABLED: 'false',
      KAFKA_BROKERS: 'kafka:29092',
    });

    expect(config.brokers).toEqual(['kafka:29092']);
  });
});
