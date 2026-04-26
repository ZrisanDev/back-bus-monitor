import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DayType } from './entities/day-type.entity';
import { DayTypesService } from './day-types.service';
import { DayTypesController } from './day-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DayType])],
  controllers: [DayTypesController],
  providers: [
    DayTypesService,
    { provide: 'IDayTypesService', useExisting: DayTypesService },
  ],
  exports: [DayTypesService, 'IDayTypesService'],
})
export class DayTypesModule {}
