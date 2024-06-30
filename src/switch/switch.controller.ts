import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SwitchService } from './switch.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@Controller('switch')
export class SwitchController {
  constructor(private readonly switchService: SwitchService) {}

  @Get()
  getSwitch() {
    return this.switchService.getSwitch();
  }

  @UseGuards(JwtGuard)
  @Patch()
  updateSwitch(@Body('isActive') isActive: boolean) {
    return this.switchService.updateSwitch(isActive);
  }
}
