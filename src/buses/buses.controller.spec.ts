import { Test, TestingModule } from '@nestjs/testing';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { Bus } from './entities/bus.entity';

describe('BusesController', () => {
  let controller: BusesController;
  let service: BusesService;

  const makeBus = (overrides: Partial<Bus> = {}): Bus => ({
    id: 1,
    code: 'BUS-001',
    capacity: 40,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    reports: [],
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusesController],
      providers: [
        {
          provide: BusesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByCode: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BusesController>(BusesController);
    service = module.get<BusesService>(BusesService);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // POST /buses
  // ═══════════════════════════════════════════════════════════════════════

  describe('create', () => {
    // ── SCN: Creates a bus via service ──────────────────────────────────

    it('should call busesService.create with DTO and return result', async () => {
      const dto: CreateBusDto = { code: 'BUS-001', capacity: 40 };
      const bus = makeBus();
      jest.spyOn(service, 'create').mockResolvedValue(bus);

      const result = await controller.create(dto);

      expect(result).toEqual(bus);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    // ── SCN: Triangulation — different DTO ──────────────────────────────

    it('should pass different DTO values to service', async () => {
      const dto: CreateBusDto = { code: 'BUS-999', capacity: 80 };
      const bus = makeBus({ code: 'BUS-999', capacity: 80 });
      jest.spyOn(service, 'create').mockResolvedValue(bus);

      const result = await controller.create(dto);

      expect(result.code).toBe('BUS-999');
      expect(result.capacity).toBe(80);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GET /buses
  // ═══════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    // ── SCN: Returns list of buses ──────────────────────────────────────

    it('should return all buses from service', async () => {
      const buses = [
        makeBus({ id: 1, code: 'BUS-001' }),
        makeBus({ id: 2, code: 'BUS-002' }),
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(buses);

      const result = await controller.findAll();

      expect(result).toEqual(buses);
      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Triangulation — empty list ─────────────────────────────────

    it('should return empty array when no buses exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
