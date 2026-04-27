/**
 * Pure function that resolves Kafka configuration from environment variables.
 *
 * This function has ZERO side effects — it takes a record of env vars and
 * returns a deterministic configuration object. Perfect for testing.
 *
 * Killswitch: KAFKA_ENABLED must be exactly "true" to enable.
 * Default is disabled for safe local development.
 */
export interface KafkaConfig {
  enabled: boolean;
  brokers: string[];
  clientId: string;
  groupId: string;
}

export function resolveKafkaConfig(
  env: Record<string, string | undefined>,
): KafkaConfig {
  const enabled = env.KAFKA_ENABLED === 'true';
  const brokers = (env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  return {
    enabled,
    brokers,
    clientId: env.KAFKA_CLIENT_ID ?? 'bus-monitor',
    groupId: env.KAFKA_GROUP_ID ?? 'bus-monitor-group',
  };
}

/**
 * Build NestJS microservice transport options from a resolved KafkaConfig.
 *
 * Uses Transport.KAFKA (enum value 6) directly to avoid importing
 * @nestjs/microservices in the config layer — keeping it a pure function.
 */
export function buildKafkaMicroserviceOptions(config: KafkaConfig) {
  return {
    transport: 6, // Transport.KAFKA
    options: {
      client: {
        brokers: config.brokers,
        clientId: config.clientId,
      },
      consumer: {
        groupId: config.groupId,
      },
    },
  };
}
