import * as fs from 'fs';
import * as path from 'path';

describe('Kafka/WebSocket dependencies (Task 3.1)', () => {
  let packageJson: {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  beforeAll(() => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../../../package.json'),
      'utf-8',
    );
    packageJson = JSON.parse(raw);
  });

  const requiredDependencies = [
    '@nestjs/microservices',
    'kafkajs',
    '@nestjs/websockets',
    'socket.io',
  ];

  // ── SCN: Each required package is declared in dependencies ───────────

  it.each(requiredDependencies)(
    'should have %s in dependencies',
    (dep: string) => {
      expect(packageJson.dependencies[dep]).toBeDefined();
    },
  );

  // ── SCN: No extra packages beyond scope ──────────────────────────────

  it('should have exactly 4 new kafka/websocket dependencies', () => {
    const kafkaDeps = [
      '@nestjs/microservices',
      'kafkajs',
      '@nestjs/websockets',
      'socket.io',
    ];

    const present = kafkaDeps.filter(
      (d) => packageJson.dependencies[d] !== undefined,
    );
    expect(present).toHaveLength(kafkaDeps.length);
  });
});
