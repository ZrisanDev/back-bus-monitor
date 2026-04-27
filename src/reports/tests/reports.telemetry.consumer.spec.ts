import { Test, TestingModule } from '@nestjs/testing';
import { ReportsTelemetryConsumer } from '../reports.telemetry.consumer';
import { BusGateway } from '../../websocket/bus.gateway';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

describe('ReportsTelemetryConsumer', () => {
  let consumer: ReportsTelemetryConsumer;
  let mockReportsService: {
    createFromTelemetry: jest.Mock;
  };
  let mockBusGateway: {
    emitBusUpdated: jest.Mock;
  };

  const makeBus = (capacity = 40) => ({ id: 1, code: 'BUS-001', capacity });

  beforeEach(async () => {
    mockReportsService = {
      createFromTelemetry: jest.fn(),
    };

    mockBusGateway = {
      emitBusUpdated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsTelemetryConsumer,
        {
          provide: 'IReportsService',
          useValue: mockReportsService,
        },
        {
          provide: BusGateway,
          useValue: mockBusGateway,
        },
      ],
    }).compile();

    consumer = module.get<ReportsTelemetryConsumer>(ReportsTelemetryConsumer);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // handleTelemetry — validates and persists
  // ═══════════════════════════════════════════════════════════════════════

  describe('handleTelemetry', () => {
    const validPayload = {
      bus_id: 1,
      route_id: 10,
      stop_id: 100,
      latitude: -12.04,
      longitude: -77.03,
      passenger_count: 25,
      timestamp: new Date().toISOString(),
      status: 'En camino a Parada Central',
      current_stop: 'Parada Sur',
      next_stop: 'Parada Central',
    };

    // ── SCN: Valid telemetry persists via ReportsService ────────────────

    it('should persist valid telemetry via createFromTelemetry', async () => {
      const savedReport = {
        id: 1,
        bus_id: 1,
        passenger_count: 25,
        bus: makeBus(),
      };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      const result = await consumer.handleTelemetry(validPayload);

      expect(result).toEqual(savedReport);
      expect(mockReportsService.createFromTelemetry).toHaveBeenCalledWith(
        validPayload.bus_id,
        expect.objectContaining({
          passenger_count: validPayload.passenger_count,
          route_id: validPayload.route_id,
          stop_id: validPayload.stop_id,
          latitude: validPayload.latitude,
          longitude: validPayload.longitude,
        }),
      );
    });

    // ── SCN: Unknown bus → NotFoundException, no persistence ───────────

    it('should reject telemetry for unknown bus with 404', async () => {
      mockReportsService.createFromTelemetry.mockRejectedValue(
        new NotFoundException('Bus con ID 999 no encontrado'),
      );

      await expect(
        consumer.handleTelemetry({ ...validPayload, bus_id: 999 }),
      ).rejects.toThrow(NotFoundException);

      expect(mockReportsService.createFromTelemetry).toHaveBeenCalled();
    });

    // ── SCN: Capacity exceeded → 422, no persistence ────────────────────

    it('should reject telemetry when passenger_count exceeds capacity (422)', async () => {
      mockReportsService.createFromTelemetry.mockRejectedValue(
        new UnprocessableEntityException(
          'La cantidad de pasajeros (100) excede la capacidad del bus (40)',
        ),
      );

      await expect(
        consumer.handleTelemetry({ ...validPayload, passenger_count: 100 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    // ── SCN: Triangulation — different valid payload ────────────────────

    it('should handle different valid telemetry payloads', async () => {
      const differentPayload = {
        bus_id: 5,
        route_id: 20,
        stop_id: 200,
        latitude: -12.1,
        longitude: -77.1,
        passenger_count: 10,
        timestamp: new Date().toISOString(),
        status: 'En Parada Norte',
        current_stop: 'Parada Norte',
        next_stop: null,
      };
      const savedReport = {
        id: 2,
        bus_id: 5,
        passenger_count: 10,
        bus: makeBus(60),
      };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      const result = await consumer.handleTelemetry(differentPayload);

      expect(result.bus_id).toBe(5);
      expect(result.passenger_count).toBe(10);
      expect(mockReportsService.createFromTelemetry).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          passenger_count: 10,
          route_id: 20,
        }),
      );
    });

    // ── SCN: Returns saved report with id ──────────────────────────────

    it('should return the persisted report with generated id', async () => {
      const savedReport = { id: 42, bus_id: 1, passenger_count: 25, bus: makeBus() };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      const result = await consumer.handleTelemetry(validPayload);

      expect(result.id).toBe(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // handleTelemetry — WebSocket emission after persistence
  // ═══════════════════════════════════════════════════════════════════════

  describe('handleTelemetry (WebSocket emission)', () => {
    const validPayload = {
      bus_id: 1,
      route_id: 10,
      stop_id: 100,
      latitude: -12.04,
      longitude: -77.03,
      passenger_count: 25,
      timestamp: '2025-06-15T12:00:00.000Z',
      status: 'En camino a Parada Central',
      current_stop: 'Parada Sur',
      next_stop: 'Parada Central',
    };

    // ── SCN: Emits bus:updated after successful persistence ──────────────

    it('should emit bus:updated after successful persistence', async () => {
      const savedReport = {
        id: 1,
        bus_id: 1,
        passenger_count: 25,
        bus: makeBus(40),
      };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      await consumer.handleTelemetry(validPayload);

      expect(mockBusGateway.emitBusUpdated).toHaveBeenCalledTimes(1);
      expect(mockBusGateway.emitBusUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          bus_id: 1,
          latitude: -12.04,
          longitude: -77.03,
          passenger_count: 25,
          occupancy_percentage: 62.5,
          timestamp: '2025-06-15T12:00:00.000Z',
        }),
      );
    });

    // ── SCN: Occupancy percentage calculated correctly ──────────────────

    it('should calculate occupancy_percentage from passenger_count/capacity rounded to 2 decimals', async () => {
      const savedReport = {
        id: 1,
        bus_id: 1,
        passenger_count: 33,
        bus: makeBus(50),
      };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      await consumer.handleTelemetry({ ...validPayload, passenger_count: 33 });

      const emitted = mockBusGateway.emitBusUpdated.mock.calls[0][0];
      expect(emitted.occupancy_percentage).toBe(66.0);
    });

    // ── SCN: 100% occupancy ─────────────────────────────────────────────

    it('should emit 100 occupancy_percentage when bus is full', async () => {
      const savedReport = {
        id: 1,
        bus_id: 1,
        passenger_count: 40,
        bus: makeBus(40),
      };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      await consumer.handleTelemetry({ ...validPayload, passenger_count: 40 });

      const emitted = mockBusGateway.emitBusUpdated.mock.calls[0][0];
      expect(emitted.occupancy_percentage).toBe(100);
    });

    // ── SCN: Does NOT emit on persistence failure ───────────────────────

    it('should not emit bus:updated when persistence fails', async () => {
      mockReportsService.createFromTelemetry.mockRejectedValue(
        new NotFoundException('Bus con ID 999 no encontrado'),
      );

      await expect(
        consumer.handleTelemetry({ ...validPayload, bus_id: 999 }),
      ).rejects.toThrow();

      expect(mockBusGateway.emitBusUpdated).not.toHaveBeenCalled();
    });

    // ── SCN: Triangulation — different bus with different capacity ──────

    it('should emit correct occupancy for different bus capacity', async () => {
      const savedReport = {
        id: 5,
        bus_id: 5,
        passenger_count: 30,
        bus: makeBus(60),
      };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      await consumer.handleTelemetry({
        ...validPayload,
        bus_id: 5,
        passenger_count: 30,
      });

      const emitted = mockBusGateway.emitBusUpdated.mock.calls[0][0];
      expect(emitted.occupancy_percentage).toBe(50);
      expect(emitted.bus_id).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // handleTelemetry — enriched telemetry (status, current_stop, next_stop)
  // ═══════════════════════════════════════════════════════════════════════

  describe('handleTelemetry (enriched telemetry)', () => {
    const enrichedPayload = {
      bus_id: 1,
      route_id: 10,
      stop_id: 100,
      latitude: -12.04,
      longitude: -77.03,
      passenger_count: 25,
      timestamp: '2025-06-15T12:00:00.000Z',
      status: 'En camino a Plaza Mayor',
      current_stop: 'Parada Central',
      next_stop: 'Plaza Mayor',
    };

    // ── SCN: Passes status, current_stop, next_stop to createFromTelemetry ──

    it('should forward status, current_stop, next_stop to createFromTelemetry', async () => {
      const savedReport = {
        id: 1,
        bus_id: 1,
        passenger_count: 25,
        bus: makeBus(40),
      };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      await consumer.handleTelemetry(enrichedPayload);

      expect(mockReportsService.createFromTelemetry).toHaveBeenCalledWith(
        enrichedPayload.bus_id,
        expect.objectContaining({
          passenger_count: 25,
          route_id: 10,
          stop_id: 100,
          latitude: -12.04,
          longitude: -77.03,
          status: 'En camino a Plaza Mayor',
          current_stop: 'Parada Central',
          next_stop: 'Plaza Mayor',
        }),
      );
    });

    // ── SCN: Emits bus:updated with status, current_stop, next_stop ──────

    it('should emit bus:updated with status, current_stop, next_stop', async () => {
      const savedReport = {
        id: 1,
        bus_id: 1,
        passenger_count: 25,
        bus: makeBus(40),
      };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      await consumer.handleTelemetry(enrichedPayload);

      expect(mockBusGateway.emitBusUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          bus_id: 1,
          status: 'En camino a Plaza Mayor',
          current_stop: 'Parada Central',
          next_stop: 'Plaza Mayor',
        }),
      );
    });

    // ── SCN: Triangulation — STOPPED status with null next_stop ──────────

    it('should forward STOPPED status and null next_stop to service and gateway', async () => {
      const stoppedPayload = {
        ...enrichedPayload,
        status: 'En Parada Norte',
        current_stop: 'Parada Norte',
        next_stop: null,
      };
      const savedReport = {
        id: 2,
        bus_id: 1,
        passenger_count: 25,
        bus: makeBus(40),
      };
      mockReportsService.createFromTelemetry.mockResolvedValue(savedReport);

      await consumer.handleTelemetry(stoppedPayload);

      expect(mockReportsService.createFromTelemetry).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'En Parada Norte',
          current_stop: 'Parada Norte',
          next_stop: null,
        }),
      );

      expect(mockBusGateway.emitBusUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'En Parada Norte',
          current_stop: 'Parada Norte',
          next_stop: null,
        }),
      );
    });
  });
});
