# bus-monitor-api · Backend

API REST + Kafka hybrid app para el sistema de monitoreo de flota en tiempo real. Gestiona buses, rutas, paraderos y reportes. Incluye un simulador de movimiento integrado que publica telemetría a Kafka y distribuye actualizaciones al frontend mediante WebSocket.

Todas las rutas HTTP tienen el prefijo `/api`. Documentación interactiva disponible en `/api/docs` (Swagger UI).

---

## Tabla de contenidos

1. [Stack](#stack)
2. [Requisitos previos](#requisitos-previos)
3. [Levantar el proyecto](#levantar-el-proyecto)
4. [Variables de entorno](#variables-de-entorno)
5. [Endpoints disponibles](#endpoints-disponibles)
6. [Estructura del proyecto](#estructura-del-proyecto)
7. [Decisiones técnicas](#decisiones-técnicas)
8. [Supuestos realizados](#supuestos-realizados)
9. [Uso de IA](#uso-de-ia)

---

## Stack

| Tecnología               | Uso                            |
| ------------------------ | ------------------------------ |
| NestJS                   | Framework principal            |
| TypeORM                  | ORM para PostgreSQL            |
| PostgreSQL               | Base de datos relacional       |
| Apache Kafka + Zookeeper | Broker de mensajería           |
| @nestjs/microservices    | Kafka producer + consumer      |
| @nestjs/websockets       | Gateway WebSocket (Socket.IO)  |
| @nestjs/swagger          | Documentación interactiva      |
| class-validator          | Validación de DTOs             |
| Docker + Docker Compose  | Contenedores e infraestructura |

---

## Requisitos previos

- Docker >= 24
- Docker Compose >= 2.20
- Node.js >= 22 (solo para desarrollo local)
- yarn >= 1.22

---

## Levantar el proyecto

### Desarrollo local (recomendado)

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar infraestructura (PostgreSQL + Kafka + Zookeeper)
docker compose up db zookeeper kafka -d

# 3. Instalar dependencias
yarn install

# 4. Ejecutar migraciones y seed
yarn migration:run
yarn seed

# 5. Iniciar en modo desarrollo
yarn dev
```

La API estará disponible en `http://localhost:{PORT}/api` (default: 3000).
Swagger UI en `http://localhost:{PORT}/api/docs`.

> **Nota**: Si no necesitás Kafka, dejá `KAFKA_ENABLED=false` en el `.env`. La API arranca en modo HTTP-only y los endpoints de simulación responden con un mensaje "disabled".

### Con Docker (alternativa)

El servicio `api` está definido en el `docker-compose.yml` pero comentado. Para usarlo:

1. Descomentá el bloque `api:` en `docker-compose.yml`
2. Ajustá las variables `DB_HOST=db` y `KAFKA_BROKERS=kafka:29092` en el entorno del contenedor
3. Ejecutá migraciones y seed manualmente antes de levantar o añadilos al CMD

```bash
docker compose up --build
```

---

### Iniciar la simulación

La simulación requiere `KAFKA_ENABLED=true` y no arranca automáticamente:

```bash
# Iniciar
curl -X POST http://localhost:{PORT}/api/simulation/start

# Detener
curl -X POST http://localhost:{PORT}/api/simulation/stop
```

---

## Variables de entorno

```env
# ── Application ──
PORT=3000

# ── Database (PostgreSQL) ──
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bus_monitor
DB_USER=postgres
DB_PASSWORD=postgres

# ── Kafka ──
# Killswitch: "true" habilita Kafka, cualquier otro valor deshabilita.
KAFKA_ENABLED=true
# Lista de brokers separados por coma.
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=bus-monitor
KAFKA_GROUP_ID=bus-monitor-group
# Puertos usados por docker-compose (no afectan la app directamente)
ZOOKEEPER_PORT=2181
KAFKA_PORT=9092
# Silencia warning de particionador de kafkajs
KAFKAJS_NO_PARTITIONER_WARNING=1
```

---

## Endpoints disponibles

> Todas las rutas llevan el prefijo `/api`.

### Buses

| Método | Ruta                                  | Descripción                              |
| ------ | ------------------------------------- | ---------------------------------------- |
| `POST` | `/api/buses`                          | Crear un bus                             |
| `GET`  | `/api/buses`                          | Listar todos los buses                   |
| `GET`  | `/api/buses/:id/reports`              | Historial de reportes por bus (paginado) |
| `GET`  | `/api/buses/:busId/active-assignment` | Asignación activa de un bus              |

### Reports

| Método | Ruta                            | Descripción                                                  |
| ------ | ------------------------------- | ------------------------------------------------------------ |
| `GET`  | `/api/reports/buses/status`     | Último estado de cada bus (`?filter=full\|active\|inactive`) |
| `POST` | `/api/reports/:id/reports`      | Registrar reporte manual para un bus (`:id` = bus_id)        |
| `GET`  | `/api/reports/backfill-preview` | Previsualizar reportes que necesitan backfill                |
| `POST` | `/api/reports/backfill-execute` | Ejecutar backfill de `route_id`/`stop_id`                    |

### Rutas

| Método   | Ruta                             | Descripción                         |
| -------- | -------------------------------- | ----------------------------------- |
| `POST`   | `/api/routes`                    | Crear una ruta                      |
| `GET`    | `/api/routes`                    | Listar todas las rutas              |
| `GET`    | `/api/routes/:id`                | Obtener una ruta por ID             |
| `PATCH`  | `/api/routes/:id`                | Actualizar una ruta                 |
| `DELETE` | `/api/routes/:id`                | Eliminar una ruta                   |
| `GET`    | `/api/routes/:id/stops`          | Paraderos de una ruta en orden      |
| `GET`    | `/api/routes/:id/geojson`        | Ruta completa en formato GeoJSON    |
| `GET`    | `/api/routes/:id/segment/:order` | Geometría de un segmento específico |

### Paraderos (Stops)

| Método   | Ruta             | Descripción         |
| -------- | ---------------- | ------------------- |
| `POST`   | `/api/stops`     | Crear un paradero   |
| `GET`    | `/api/stops`     | Listar paraderos    |
| `GET`    | `/api/stops/:id` | Obtener paradero    |
| `PATCH`  | `/api/stops/:id` | Actualizar paradero |
| `DELETE` | `/api/stops/:id` | Eliminar paradero   |

### Route-Stops

| Método   | Ruta                   | Descripción                  |
| -------- | ---------------------- | ---------------------------- |
| `POST`   | `/api/route-stops`     | Crear relación ruta-paradero |
| `GET`    | `/api/route-stops`     | Listar todas las relaciones  |
| `GET`    | `/api/route-stops/:id` | Obtener relación por ID      |
| `PATCH`  | `/api/route-stops/:id` | Actualizar relación          |
| `DELETE` | `/api/route-stops/:id` | Eliminar relación            |

### Bus-Assignments

| Método   | Ruta                                | Descripción                               |
| -------- | ----------------------------------- | ----------------------------------------- |
| `POST`   | `/api/bus-assignments`              | Crear asignación bus → ruta               |
| `GET`    | `/api/bus-assignments`              | Listar asignaciones (filtros opcionales)  |
| `GET`    | `/api/bus-assignments/:id`          | Obtener asignación por ID                 |
| `PATCH`  | `/api/bus-assignments/:id`          | Actualizar asignación                     |
| `PATCH`  | `/api/bus-assignments/:id/unassign` | Cerrar (desasignar) una asignación activa |
| `DELETE` | `/api/bus-assignments/:id`          | Eliminar asignación                       |

**Filtros disponibles en `GET /api/bus-assignments`**: `?bus_id=&route_id=&active_only=true`

### Simulación

| Método | Ruta                    | Descripción                           |
| ------ | ----------------------- | ------------------------------------- |
| `POST` | `/api/simulation/start` | Iniciar simulación de todos los buses |
| `POST` | `/api/simulation/stop`  | Detener simulación                    |

### Salud y documentación

| Método | Ruta          | Descripción                            |
| ------ | ------------- | -------------------------------------- |
| `GET`  | `/api/health` | Verificar que el servicio está activo  |
| `GET`  | `/api/docs`   | Swagger UI — documentación interactiva |

### WebSocket

| Evento        | Dirección       | Descripción                                       |
| ------------- | --------------- | ------------------------------------------------- |
| `bus:updated` | Server → Client | Payload con ubicación, pasajeros y estado del bus |

---

## Estructura del proyecto

```
src/
├── buses/
│   ├── dto/
│   │   └── create-bus.dto.ts
│   ├── entities/
│   │   └── bus.entity.ts
│   ├── interfaces/
│   ├── validators/
│   ├── tests/
│   ├── buses.controller.ts
│   ├── buses.service.ts
│   └── buses.module.ts
├── reports/
│   ├── dto/
│   │   └── create-report.dto.ts
│   ├── entities/
│   │   └── report.entity.ts
│   ├── interfaces/
│   ├── services/
│   ├── tests/
│   ├── reports.controller.ts       # GET status + POST reporte manual
│   ├── reports.service.ts
│   ├── reports.telemetry.consumer.ts  # Kafka consumer
│   └── reports.module.ts
├── simulator/
│   ├── tests/
│   ├── kafka-producer.service.ts   # Kafka producer
│   ├── simulator.controller.ts     # POST /simulation/start|stop
│   ├── simulator.service.ts        # Lógica de fases MOVING / STOPPED
│   └── simulator.module.ts
├── websocket/
│   ├── tests/
│   └── bus.gateway.ts              # WebSocket gateway — evento bus:updated
├── routes/
│   ├── dto/
│   ├── entities/
│   ├── interfaces/
│   ├── tests/
│   ├── routes.controller.ts
│   ├── routes.service.ts
│   └── routes.module.ts
├── stops/
│   ├── dto/
│   ├── entities/
│   ├── interfaces/
│   ├── tests/
│   ├── stops.controller.ts
│   ├── stops.service.ts
│   └── stops.module.ts
├── route-stops/
│   ├── dto/
│   ├── entities/
│   ├── interfaces/
│   ├── tests/
│   ├── route-stops.controller.ts
│   ├── route-stops.service.ts
│   └── route-stops.module.ts
├── bus-assignments/
│   ├── dto/
│   ├── entities/
│   ├── interfaces/
│   ├── tests/
│   ├── bus-assignments.controller.ts   # CRUD + PATCH :id/unassign
│   ├── bus-assignments.service.ts
│   └── bus-assignments.module.ts
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── tests/
│   └── database.module.ts
├── common/
│   ├── decorators/
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── transform.interceptor.ts
│   ├── types/
│   ├── tests/
│   └── index.ts
├── health/
│   ├── tests/
│   ├── health.controller.ts
│   ├── health.service.ts
│   └── health.module.ts
├── config/
│   ├── tests/
│   └── kafka.config.ts             # resolveKafkaConfig (función pura)
├── tests/                          # Test de integración e2e
├── app.module.ts
└── main.ts                         # hybrid app: HTTP + Kafka microservice
```

---

## Decisiones técnicas

### Decisiones tomadas por mí

**NestJS como framework**

Elegí NestJS por su estructura modular nativa — cada dominio (buses, reports, simulator, gateway) vive en su propio módulo con responsabilidades claras. Su integración con `@nestjs/microservices` permite levantar el servidor HTTP y el consumer de Kafka en la misma instancia sin configuración adicional compleja.

**Kafka dentro del mismo proyecto NestJS (hybrid app)**

Decidí no crear un microservicio separado para el simulador porque el plazo del MVP no lo justifica. NestJS soporta ser producer y consumer simultáneamente mediante `app.connectMicroservice()`. El `SimulatorModule` está diseñado para extraerse a un microservicio independiente en el futuro sin cambiar el contrato del mensaje Kafka — solo se mueve el módulo.

**Kafka killswitch (`KAFKA_ENABLED`)**

El archivo `config/kafka.config.ts` expone una función pura `resolveKafkaConfig()` que lee la variable `KAFKA_ENABLED`. Cuando es `false`, la API arranca en modo HTTP-only y los endpoints de simulación responden con un mensaje determinista "disabled". Esto permite desarrollo local sin levantar Kafka.

**Geometría de rutas por segmento (RouteStop.segment_geometry)**

En lugar de guardar el trazado completo en `Route`, guardé la geometría de cada tramo entre paraderos consecutivos en `RouteStop`. Esto permite saber en qué segmento exacto va el bus en tiempo real, necesario para que el simulador avance punto a punto y no salte de paradero en paradero.

**Coordenadas reales del Metropolitano**

Conté con las coordenadas reales de cada paradero, lo que eliminó la necesidad de geocodificación y hace que el movimiento simulado sea geográficamente preciso.

**Simulación con fases MOVING / STOPPED**

El simulador alterna entre dos fases explícitas. En `MOVING` avanza punto a punto por `segment_geometry`. En `STOPPED` permanece detenido 1 minuto en el paradero con variación gradual de pasajeros. Este modelo replica el comportamiento real de un bus urbano.

**Estados descriptivos del bus (status)**

El campo `status` con valores como `"Salió de X"`, `"En camino a X"`, `"Llegando a X"` y `"En X"` comunica el estado en lenguaje natural. Se persiste en la tabla `Report` para que el historial también lo refleje.

**PostgreSQL como motor SQL**

Es el motor más compatible con PostGIS si en el futuro se necesitan consultas geoespaciales avanzadas sobre `segment_geometry`.

**Asignación de rutas vía BusAssignments**

La relación bus ↔ ruta se maneja con el módulo `bus-assignments`, que soporta activación y desactivación de asignaciones. Esto permite historial de qué bus estuvo en qué ruta y cuándo.

---

### Decisiones sugeridas por IA y adoptadas

**Kafka + Zookeeper para mensajería**

Kafka como broker de mensajería con Zookeeper para coordinación. Compatible con el ecosistema Kafka de KafkaJS y `@nestjs/microservices`.

**OSRM para geometría real de calles**

Usado en el proceso de setup one-time para obtener el trazado real de cada segmento entre paraderos. Sin esto los buses se moverían en líneas rectas atravesando edificios. Es gratuito y no requiere API key.

**WebSocket para actualizaciones en tiempo real**

El `BusGateway` emite el evento `bus:updated` tras cada persistencia exitosa de reporte. El frontend escucha este evento y actualiza la UI sin polling.

**Swagger para documentación de API**

Integrado con `@nestjs/swagger` y decoradores en cada controller. Disponible en `/api/docs` para exploración interactiva.

---

## Uso de IA

### Asistido con IA

- Estructura modular del proyecto y árbol de carpetas.
- Definición del modelo de datos: entidades `Stop`, `Route`, `RouteStop` con `segment_geometry` y `next_stop_id`.
- Payload del evento Kafka `bus.telemetry` y del evento WebSocket `bus:updated`.
- Estructura del GeoJSON devuelto por `GET /routes/:id/geojson`.
- Arquitectura de las fases `MOVING` / `STOPPED` del simulador.
- Identificación del problema de la simulación original y propuesta de corrección.
- Sugerencia de OSRM.
- Redacción de este README.

### Decidido directamente por mí

- Elección de NestJS como framework.
- Mantener el simulador dentro del mismo proyecto en lugar de extraerlo como microservicio separado.
- Elegir geometría por segmento en `RouteStop` (Opción A) sobre geometría completa en `Route` (Opción B).
- Usar coordenadas reales del Metropolitano de Lima.
- Definir la parada de 1 minuto con variación gradual de pasajeros durante ese tiempo.
- Definir los cuatro estados descriptivos del bus.
- Persistir el campo `status` en la tabla `Report`.
- Usar Kafka + Zookeeper como broker de mensajería.
- Crear el módulo `bus-assignments` para manejar la relación bus ↔ ruta con activación/desactivación.
- Implementar el killswitch `KAFKA_ENABLED` para desarrollo local sin Kafka.
