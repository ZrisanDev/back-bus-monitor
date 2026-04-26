import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateDirectionDto } from './dto/create-direction.dto';
import { UpdateDirectionDto } from './dto/update-direction.dto';

@ApiTags('directions')
@Controller('directions')
export class DirectionsController {
  constructor(
    @Inject('IDirectionsService') private readonly directionsService: any,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new direction' })
  @ApiResponse({ status: 201, description: 'Direction created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  create(@Body() dto: CreateDirectionDto) {
    return this.directionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all directions' })
  @ApiResponse({ status: 200, description: 'List of directions' })
  findAll() {
    return this.directionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a direction by id' })
  @ApiResponse({ status: 200, description: 'Direction found' })
  @ApiResponse({ status: 404, description: 'Direction not found' })
  findOne(@Param('id') id: string) {
    return this.directionsService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a direction' })
  @ApiResponse({ status: 200, description: 'Direction updated' })
  @ApiResponse({ status: 404, description: 'Direction not found' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  update(@Param('id') id: string, @Body() dto: UpdateDirectionDto) {
    return this.directionsService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a direction' })
  @ApiResponse({ status: 200, description: 'Direction deleted' })
  @ApiResponse({ status: 404, description: 'Direction not found' })
  remove(@Param('id') id: string) {
    return this.directionsService.remove(Number(id));
  }
}
