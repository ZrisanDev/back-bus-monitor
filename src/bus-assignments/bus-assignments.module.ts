import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusAssignment } from './entities/bus-assignment.entity';
import { BusAssignmentsService } from './bus-assignments.service';
import { BusAssignmentsController, BusActiveAssignmentController } from './bus-assignments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BusAssignment])],
  controllers: [BusAssignmentsController, BusActiveAssignmentController],
  providers: [
    BusAssignmentsService,
    { provide: 'IBusAssignmentsService', useExisting: BusAssignmentsService },
  ],
  exports: [BusAssignmentsService, 'IBusAssignmentsService'],
})
export class BusAssignmentsModule {}
