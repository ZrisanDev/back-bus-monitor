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
        status: 'En camino a Plaza Mayor',
        current_stop: 'Parada Central',
        next_stop: 'Plaza Mayor',
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
        status: 'En Parada Norte',
        current_stop: 'Parada Norte',
        next_stop: null,
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
        status: 'Salió de Terminal',
        current_stop: 'Terminal',
        next_stop: 'Parada A',
      };

      gateway.emitBusUpdated(payload);

      const emittedPayload = mockServer.emit.mock.calls[0][1];
      expect(emittedPayload).toHaveProperty('bus_id');
      expect(emittedPayload).toHaveProperty('latitude');
      expect(emittedPayload).toHaveProperty('longitude');
      expect(emittedPayload).toHaveProperty('passenger_count');
      expect(emittedPayload).toHaveProperty('occupancy_percentage');
      expect(emittedPayload).toHaveProperty('timestamp');
      expect(emittedPayload).toHaveProperty('status');
      expect(emittedPayload).toHaveProperty('current_stop');
      expect(emittedPayload).toHaveProperty('next_stop');
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
        status: 'En camino a Parada B',
        current_stop: 'Parada A',
        next_stop: 'Parada B',
      });

      gateway.emitBusUpdated({
        bus_id: 2,
        latitude: -12.05,
        longitude: -77.04,
        passenger_count: 30,
        occupancy_percentage: 75,
        timestamp: '2025-06-15T12:00:01.000Z',
        status: 'Llegando a Parada C',
        current_stop: 'Parada B',
        next_stop: 'Parada C',
      });

      expect(mockServer.emit).toHaveBeenCalledTimes(2);
      expect(mockServer.emit.mock.calls[0][1].bus_id).toBe(1);
      expect(mockServer.emit.mock.calls[1][1].bus_id).toBe(2);
    });

    // ── SCN: Enriched fields passed through correctly ─────────────────────

    it('should pass status, current_stop, and next_stop through to emitted event', () => {
      const payload = {
        bus_id: 3,
        latitude: -12.06,
        longitude: -77.05,
        passenger_count: 15,
        occupancy_percentage: 37.5,
        timestamp: '2025-06-15T14:00:00.000Z',
        status: 'Llegando a Plaza Mayor',
        current_stop: 'Mercado',
        next_stop: 'Plaza Mayor',
      };

      gateway.emitBusUpdated(payload);

      const emittedPayload = mockServer.emit.mock.calls[0][1];
      expect(emittedPayload.status).toBe('Llegando a Plaza Mayor');
      expect(emittedPayload.current_stop).toBe('Mercado');
      expect(emittedPayload.next_stop).toBe('Plaza Mayor');
    });

    // ── SCN: Triangulation — STOPPED status with null next_stop ───────────

    it('should handle null next_stop for buses at last stop', () => {
      const payload = {
        bus_id: 7,
        latitude: -12.07,
        longitude: -77.06,
        passenger_count: 10,
        occupancy_percentage: 25,
        timestamp: '2025-06-15T15:00:00.000Z',
        status: 'En Terminal',
        current_stop: 'Terminal',
        next_stop: null,
      };

      gateway.emitBusUpdated(payload);

      const emittedPayload = mockServer.emit.mock.calls[0][1];
      expect(emittedPayload.status).toBe('En Terminal');
      expect(emittedPayload.current_stop).toBe('Terminal');
      expect(emittedPayload.next_stop).toBeNull();
    });
  });
});
