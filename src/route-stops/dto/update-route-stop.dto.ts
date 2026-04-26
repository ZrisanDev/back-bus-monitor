import { PartialType } from '@nestjs/swagger';
import { CreateRouteStopDto } from './create-route-stop.dto';

export class UpdateRouteStopDto extends PartialType(CreateRouteStopDto) {}
