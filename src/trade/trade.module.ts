import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [TradeService],
  controllers: [TradeController],
})
export class TradeModule {}
