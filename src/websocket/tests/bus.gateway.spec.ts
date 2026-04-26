import { BusGateway } from '../bus.gateway';

describe('BusGateway', () => {
  let gateway: BusGateway;
  let mockServer: {
    emit: jest.Mock;
  };

  beforeEach(() => {
    mockServer = {
      emit: jest.fn(),
    };

    // Instantiate directly — the gateway is thin, no DI deps needed
    gateway = new BusGateway();
    gateway.server = mockServer as any;
  });

  // ═══════════════════════════════════════════════════════════════════════
  // emitBusUpdated — emits bus:updated with full payload
  // ═══════════════════════════════════════════════════════════════════════

  describe('emitBusUpdated', () => {
    // ── SCN: Emits bus:updated with complete payload ─────────────────────

    it('should emit bus:updated event with full payload', () => {
      const payload = {
        bus_id: 1,
        latitude: -12.04,
        longitude: -77.03,
        passenger_count: 25,
        occupancy_percentage: 62.5,
        timestamp: '2025-06-15T12:00:00.000Z',
      };

      gateway.emitBusUpdated(payload);

      expect(mockServer.emit).toHaveBeenCalledWith('bus:updated', payload);
    });

    // ── SCN: Triangulation — different payload values ────────────────────

    it('should emit with different payload values', () => {
      const payload = {
        bus_id: 5,
        latitude: -12.1,
        longitude: -77.1,
        passenger_count: 60,
        occupancy_percentage: 100,
        timestamp: '2025-06-15T13:00:00.000Z',
      };

      gateway.emitBusUpdated(payload);

      expect(mockServer.emit).toHaveBeenCalledWith('bus:updated', payload);
      expect(mockServer.emit).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Emitted data contains all required fields ──────────────────

    it('should emit payload with all required fields', () => {
      const payload = {
        bus_id: 1,
        latitude: -12.04,
        longitude: -77.03,
        passenger_count: 0,
        occupancy_percentage: 0,
        timestamp: new Date().toISOString(),
      };

      gateway.emitBusUpdated(payload);

      const emittedPayload = mockServer.emit.mock.calls[0][1];
      expect(emittedPayload).toHaveProperty('bus_id');
      expect(emittedPayload).toHaveProperty('latitude');
      expect(emittedPayload).toHaveProperty('longitude');
      expect(emittedPayload).toHaveProperty('passenger_count');
      expect(emittedPayload).toHaveProperty('occupancy_percentage');
      expect(emittedPayload).toHaveProperty('timestamp');
    });

    // ── SCN: Multiple emissions for different buses ──────────────────────

    it('should emit separate events for different buses', () => {
      gateway.emitBusUpdated({
        bus_id: 1,
        latitude: -12.04,
        longitude: -77.03,
        passenger_count: 20,
        occupancy_percentage: 50,
        timestamp: '2025-06-15T12:00:00.000Z',
      });

      gateway.emitBusUpdated({
        bus_id: 2,
        latitude: -12.05,
        longitude: -77.04,
        passenger_count: 30,
        occupancy_percentage: 75,
        timestamp: '2025-06-15T12:00:01.000Z',
      });

      expect(mockServer.emit).toHaveBeenCalledTimes(2);
      expect(mockServer.emit.mock.calls[0][1].bus_id).toBe(1);
      expect(mockServer.emit.mock.calls[1][1].bus_id).toBe(2);
    });
  });
});
