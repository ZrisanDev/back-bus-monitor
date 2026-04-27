import { buildKafkaMicroserviceOptions } from '../kafka.config';

describe('buildKafkaMicroserviceOptions', () => {
  // ── SCN: Returns valid Kafka transport options ───────────────────────

  it('should return Kafka transport options with brokers from config', () => {
    const options = buildKafkaMicroserviceOptions({
      enabled: true,
      brokers: ['kafka:29092'],
      clientId: 'test-client',
      groupId: 'test-group',
    });

    expect(options).toEqual({
      transport: 6, // Transport.KAFKA enum value
      options: {
        client: {
          brokers: ['kafka:29092'],
          clientId: 'test-client',
        },
        consumer: {
          groupId: 'test-group',
        },
      },
    });
  });

  // ── SCN: Multiple brokers preserved ─────────────────────────────────

  it('should preserve multiple brokers', () => {
    const options = buildKafkaMicroserviceOptions({
      enabled: true,
      brokers: ['b1:9092', 'b2:9092'],
      clientId: 'test',
      groupId: 'group',
    });

    expect(options.options.client.brokers).toEqual(['b1:9092', 'b2:9092']);
  });
});
