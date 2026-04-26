import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import {
  resolveKafkaConfig,
  buildKafkaMicroserviceOptions,
} from './config/kafka.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // ── Kafka hybrid bootstrap (conditional on KAFKA_ENABLED) ──────────
  const kafkaConfig = resolveKafkaConfig(process.env);
  if (kafkaConfig.enabled) {
    const microserviceOptions =
      buildKafkaMicroserviceOptions(kafkaConfig);
    app.connectMicroservice(microserviceOptions);
    await app.startAllMicroservices();
    console.log(
      `📨 Kafka microservice connected to ${kafkaConfig.brokers.join(', ')}`,
    );
  } else {
    console.log('📨 Kafka disabled — running in HTTP-only mode');
  }

  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Bus Monitor API')
    .setDescription('API for monitoring bus location and passenger count')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚌 Bus Monitor API running on http://localhost:${port}`);
}
bootstrap();
