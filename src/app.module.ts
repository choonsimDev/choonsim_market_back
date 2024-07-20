import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';
import { TradeModule } from './trade/trade.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { SwitchModule } from './switch/switch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    OrderModule,
    PrismaModule,
    TradeModule,
    AuthModule,
    SwitchModule,
  ],
})
export class AppModule {}
