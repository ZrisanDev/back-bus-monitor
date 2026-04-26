import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateBusAssignmentDto } from './dto/create-bus-assignment.dto';
import { UpdateBusAssignmentDto } from './dto/update-bus-assignment.dto';

@ApiTags('bus-assignments')
@Controller('bus-assignments')
export class BusAssignmentsController {
  constructor(
    @Inject('IBusAssignmentsService') private readonly assignmentsService: any,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bus assignment' })
  @ApiResponse({ status: 201, description: 'Assignment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Bus already has an active assignment' })
  create(@Body() dto: CreateBusAssignmentDto) {
    return this.assignmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bus assignments' })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  findAll(
    @Query('bus_id') busId?: string,
    @Query('route_id') routeId?: string,
    @Query('active_only') activeOnly?: string,
  ) {
    const filters: { bus_id?: number; route_id?: number; active_only?: boolean } = {};
    if (busId !== undefined) filters.bus_id = Number(busId);
    if (routeId !== undefined) filters.route_id = Number(routeId);
    if (activeOnly !== undefined) filters.active_only = activeOnly === 'true';

    return this.assignmentsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an assignment by id' })
  @ApiResponse({ status: 200, description: 'Assignment found' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an assignment' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  update(@Param('id') id: string, @Body() dto: UpdateBusAssignmentDto) {
    return this.assignmentsService.update(Number(id), dto);
  }

  @Patch(':id/unassign')
  @ApiOperation({ summary: 'Unassign (close) an active assignment' })
  @ApiResponse({ status: 200, description: 'Assignment closed' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @ApiResponse({ status: 400, description: 'Assignment already closed' })
  unassign(@Param('id') id: string) {
    return this.assignmentsService.unassign(Number(id));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an assignment' })
  @ApiResponse({ status: 200, description: 'Assignment deleted' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(Number(id));
  }
}

@ApiTags('buses')
@Controller('buses')
export class BusActiveAssignmentController {
  constructor(
    @Inject('IBusAssignmentsService') private readonly assignmentsService: any,
  ) {}

  @Get(':busId/active-assignment')
  @ApiOperation({ summary: 'Get the current active assignment for a bus' })
  @ApiResponse({ status: 200, description: 'Active assignment or null' })
  findActiveByBusId(@Param('busId') busId: string) {
    return this.assignmentsService.findActiveByBusId(Number(busId));
  }
}
