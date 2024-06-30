import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Switch } from '@prisma/client';

@Injectable()
export class SwitchService {
  constructor(private prisma: PrismaService) {}

  async getSwitch(): Promise<Switch | null> {
    return this.prisma.switch.findFirst();
  }

  async updateSwitch(isActive: boolean): Promise<Switch> {
    const switchInstance = await this.prisma.switch.findFirst();
    if (switchInstance) {
      return this.prisma.switch.update({
        where: { id: switchInstance.id },
        data: { isActive },
      });
    } else {
      // 스위치가 없으면 생성
      return this.prisma.switch.create({
        data: { isActive },
      });
    }
  }
}
