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
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@ApiTags('holidays')
@Controller('holidays')
export class HolidaysController {
  constructor(
    @Inject('IHolidaysService') private readonly holidaysService: any,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new holiday' })
  @ApiResponse({ status: 201, description: 'Holiday created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Date already exists' })
  create(@Body() dto: CreateHolidayDto) {
    return this.holidaysService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all holidays' })
  @ApiResponse({ status: 200, description: 'List of holidays' })
  findAll() {
    return this.holidaysService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a holiday by id' })
  @ApiResponse({ status: 200, description: 'Holiday found' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  findOne(@Param('id') id: string) {
    return this.holidaysService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a holiday' })
  @ApiResponse({ status: 200, description: 'Holiday updated' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  @ApiResponse({ status: 409, description: 'Date already exists' })
  update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.holidaysService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a holiday' })
  @ApiResponse({ status: 200, description: 'Holiday deleted' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  remove(@Param('id') id: string) {
    return this.holidaysService.remove(Number(id));
  }
}
