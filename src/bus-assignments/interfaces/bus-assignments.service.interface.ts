import { BusAssignment } from '../entities/bus-assignment.entity';
import { CreateBusAssignmentDto } from '../dto/create-bus-assignment.dto';
import { UpdateBusAssignmentDto } from '../dto/update-bus-assignment.dto';

export interface IBusAssignmentsService {
  create(dto: CreateBusAssignmentDto): Promise<BusAssignment>;
  findAll(filters?: { bus_id?: number; route_id?: number; active_only?: boolean }): Promise<BusAssignment[]>;
  findOne(id: number): Promise<BusAssignment>;
  update(id: number, dto: UpdateBusAssignmentDto): Promise<BusAssignment>;
  remove(id: number): Promise<BusAssignment>;
  unassign(id: number): Promise<BusAssignment>;
  findActiveByBusId(busId: number): Promise<BusAssignment | null>;
}
