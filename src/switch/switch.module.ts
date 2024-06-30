import { Module } from '@nestjs/common';
import { SwitchService } from './switch.service';
import { SwitchController } from './switch.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SwitchService],
  controllers: [SwitchController]
})
export class SwitchModule {}
