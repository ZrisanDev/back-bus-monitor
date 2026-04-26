import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

/**
 * Task 3.2: Validates that docker-compose.yml has Zookeeper + Kafka
 * and .env.example documents the KAFKA_ENABLED killswitch.
 *
 * These tests verify CONFIGURATION, not running containers.
 */
describe('Kafka Docker/Env configuration (Task 3.2)', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  // ── docker-compose.yml ──────────────────────────────────────────────

  describe('docker-compose.yml', () => {
    let compose: any;

    beforeAll(() => {
      const raw = fs.readFileSync(
        path.join(rootDir, 'docker-compose.yml'),
        'utf-8',
      );
      compose = yaml.parse(raw);
    });

    // ── SCN: Zookeeper service is defined ───────────────────────────────

    it('should define a zookeeper service', () => {
      expect(compose.services.zookeeper).toBeDefined();
      expect(compose.services.zookeeper.image).toContain('zookeeper');
    });

    // ── SCN: Kafka service is defined and depends on zookeeper ──────────

    it('should define a kafka service depending on zookeeper', () => {
      expect(compose.services.kafka).toBeDefined();
      expect(compose.services.kafka.image).toContain('kafka');

      const kafkaDepends = compose.services.kafka.depends_on;
      expect(kafkaDepends).toBeDefined();
      // depends_on can be object or array
      if (typeof kafkaDepends === 'object' && !Array.isArray(kafkaDepends)) {
        expect(kafkaDepends).toHaveProperty('zookeeper');
      } else if (Array.isArray(kafkaDepends)) {
        expect(kafkaDepends).toContain('zookeeper');
      }
    });

    // ── SCN: Kafka exposes port to host ─────────────────────────────────

    it('should expose kafka port to host', () => {
      const ports: string[] = compose.services.kafka.ports;
      expect(ports).toBeDefined();
      expect(Array.isArray(ports)).toBe(true);
      expect(ports.length).toBeGreaterThan(0);
    });

    // ── SCN: Kafka service has KAFKA_CFG_LISTENERS or equivalent ────────

    it('should configure kafka with PLAINTEXT listener', () => {
      const kafka = compose.services.kafka;
      const env = kafka.environment;
      expect(env).toBeDefined();

      // At minimum, some listener configuration must exist
      const envStr = JSON.stringify(env);
      const hasListenerConfig =
        envStr.includes('LISTENERS') ||
        envStr.includes('listeners') ||
        envStr.includes('ADVERTISED');
      expect(hasListenerConfig).toBe(true);
    });

    // ── SCN: API service does NOT depend on kafka (graceful degradation) ─

    it('should NOT make api service depend on kafka (graceful degradation)', () => {
      const apiDepends = compose.services.api?.depends_on;
      if (apiDepends) {
        const dependsOnKafka =
          typeof apiDepends === 'object' && !Array.isArray(apiDepends)
            ? 'kafka' in apiDepends
            : Array.isArray(apiDepends) && apiDepends.includes('kafka');
        expect(dependsOnKafka).toBe(false);
      }
      // If no depends_on at all, or only db — that's fine too
    });
  });

  // ── .env.example ────────────────────────────────────────────────────

  describe('.env.example', () => {
    let envContent: string;

    beforeAll(() => {
      envContent = fs.readFileSync(
        path.join(rootDir, '.env.example'),
        'utf-8',
      );
    });

    // ── SCN: KAFKA_ENABLED killswitch is documented ─────────────────────

    it('should document KAFKA_ENABLED variable', () => {
      expect(envContent).toContain('KAFKA_ENABLED');
    });

    // ── SCN: KAFKA_BROKERS is documented ────────────────────────────────

    it('should document KAFKA_BROKERS variable', () => {
      expect(envContent).toContain('KAFKA_BROKERS');
    });

    // ── SCN: Default KAFKA_ENABLED=false for safe local development ────

    it('should default KAFKA_ENABLED to false for safe local dev', () => {
      const line = envContent
        .split('\n')
        .find((l) => l.startsWith('KAFKA_ENABLED'));
      expect(line).toBeDefined();
      expect(line).toContain('false');
    });
  });
});
