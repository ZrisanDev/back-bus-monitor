import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull } from 'typeorm';
import { BusAssignment } from './entities/bus-assignment.entity';
import { CreateBusAssignmentDto } from './dto/create-bus-assignment.dto';
import { UpdateBusAssignmentDto } from './dto/update-bus-assignment.dto';
import { IBusAssignmentsService } from './interfaces/bus-assignments.service.interface';

@Injectable()
export class BusAssignmentsService implements IBusAssignmentsService {
  constructor(
    @InjectRepository(BusAssignment)
    private readonly assignmentRepository: Repository<BusAssignment>,
  ) {}

  async create(dto: CreateBusAssignmentDto): Promise<BusAssignment> {
    // Check for active assignment on this bus
    const activeAssignment = await this.assignmentRepository.findOneBy({
      bus_id: dto.bus_id,
      unassigned_at: null as any,
    });
    if (activeAssignment) {
      throw new ConflictException(
        `El bus ${dto.bus_id} ya tiene una asignación activa en la ruta ${activeAssignment.route_id}`,
      );
    }

    const assignment = this.assignmentRepository.create({
      ...dto,
      assigned_at: new Date(),
    });
    return this.assignmentRepository.save(assignment);
  }

  async findAll(filters?: { bus_id?: number; route_id?: number; active_only?: boolean }): Promise<BusAssignment[]> {
    const where: FindOptionsWhere<BusAssignment> = {};

    if (filters?.bus_id !== undefined) {
      where.bus_id = filters.bus_id;
    }
    if (filters?.route_id !== undefined) {
      where.route_id = filters.route_id;
    }
    if (filters?.active_only === true) {
      where.unassigned_at = IsNull() as any;
    }

    return this.assignmentRepository.find({ where });
  }

  async findOne(id: number): Promise<BusAssignment> {
    const assignment = await this.assignmentRepository.findOneBy({ id });
    if (!assignment) {
      throw new NotFoundException(`Asignación con ID ${id} no encontrada`);
    }
    return assignment;
  }

  async update(id: number, dto: UpdateBusAssignmentDto): Promise<BusAssignment> {
    const assignment = await this.findOne(id);

    Object.assign(assignment, dto);
    return this.assignmentRepository.save(assignment);
  }

  async unassign(id: number): Promise<BusAssignment> {
    const assignment = await this.findOne(id);

    if (assignment.unassigned_at !== null) {
      throw new BadRequestException(
        `La asignación con ID ${id} ya fue desasignada`,
      );
    }

    assignment.unassigned_at = new Date();
    return this.assignmentRepository.save(assignment);
  }

  async findActiveByBusId(busId: number): Promise<BusAssignment | null> {
    return this.assignmentRepository.findOneBy({
      bus_id: busId,
      unassigned_at: null as any,
    });
  }

  async remove(id: number): Promise<BusAssignment> {
    const assignment = await this.findOne(id);
    return this.assignmentRepository.remove(assignment);
  }
}
