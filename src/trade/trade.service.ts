import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Trade } from './trade.entity';
import { DailyTradeStat } from './daily-trade-stat.interface';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class TradeService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async getAllTrades(): Promise<any[]> {
    // 반환 타입 변경
    const trades = await this.prisma.trade.findMany({
      include: {
        buyOrder: true,
        sellOrder: true,
      },
    });

    return trades.map((trade) => ({
      ...trade,
      buyAmount: trade.buyOrder ? trade.buyOrder.amount : null,
      buyRemainingAmount: trade.buyOrder
        ? trade.buyOrder.remainingAmount
        : null,
      sellAmount: trade.sellOrder ? trade.sellOrder.amount : null,
      sellRemainingAmount: trade.sellOrder
        ? trade.sellOrder.remainingAmount
        : null,
    }));
  }
  private async getBtcToKrwRate(): Promise<number> {
    try {
      const response = await lastValueFrom(
        this.httpService.get('https://api.upbit.com/v1/ticker?markets=KRW-BTC'),
      );
      return response.data[0].trade_price; // Assuming trade_price is the field for the current price
    } catch (error) {
      console.error('Failed to fetch BTC-KRW rate:', error);
      return null; // Or handle differently
    }
  }

  private getKoreanDateString(date: Date): string {
    const koreanTimeOffset = 9 * 60 * 60 * 1000; // KST (UTC+9)
    const koreanDate = new Date(date.getTime() + koreanTimeOffset);
    return koreanDate.toISOString().split('T')[0];
  }

  async getDailyTradeStats(): Promise<DailyTradeStat[]> {
    return this.prisma.dailyStats.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async getPaginatedDailyTradeStats(skip: number, limit: number): Promise<DailyTradeStat[]> {
    return this.prisma.dailyStats.findMany({
      skip: skip,
      take: limit,
      orderBy: { date: 'desc' },
    });
  }

  async saveTodayStats(): Promise<DailyTradeStat | null> {
    const today = this.getKoreanDateString(new Date());
    const trades = await this.prisma.trade.findMany({
      where: {
        createdAt: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(
            new Date(`${today}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000,
          ),
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const btcRate = await this.getBtcToKrwRate();
    if (!btcRate) return null;

    let todayStats;
    if (trades.length === 0) {
      todayStats = {
        date: today,
        totalAmount: 0,
        totalPrice: 0,
        highPrice: 0,
        lowPrice: 0,
        closePrice: 0,
        openPrice: 0,
        averagePrice: 0,
        openPriceBTC: 0,
        highPriceBTC: 0,
        lowPriceBTC: 0,
        closePriceBTC: 0,
      };
    } else {
      const stats = trades.reduce(
        (acc, trade, index) => {
          const priceInBTC = trade.price / btcRate;
          if (index === 0) {
            acc.openPrice = trade.price;
            acc.openPriceBTC = priceInBTC;
          }

          acc.totalAmount += trade.amount;
          acc.totalPrice += trade.price * trade.amount;
          acc.highPrice = Math.max(acc.highPrice, trade.price);
          acc.lowPrice = Math.min(acc.lowPrice, trade.price);
          acc.closePrice = trade.price;
          acc.highPriceBTC = Math.max(acc.highPriceBTC, priceInBTC);
          acc.lowPriceBTC = Math.min(acc.lowPriceBTC, priceInBTC);
          acc.closePriceBTC = priceInBTC;

          return acc;
        },
        {
          date: today,
          totalAmount: 0,
          totalPrice: 0,
          highPrice: 0,
          lowPrice: Infinity,
          closePrice: 0,
          openPrice: 0,
          openPriceBTC: 0,
          highPriceBTC: 0,
          lowPriceBTC: Infinity,
          closePriceBTC: 0,
        },
      );

      todayStats = {
        ...stats,
        averagePrice: stats.totalPrice / stats.totalAmount,
        lowPrice: stats.lowPrice === Infinity ? 0 : stats.lowPrice,
        lowPriceBTC: stats.lowPriceBTC === Infinity ? 0 : stats.lowPriceBTC,
      };
    }

    await this.prisma.dailyStats.upsert({
      where: { date: today },
      update: todayStats,
      create: todayStats,
    });

    return todayStats;
  }

  async getTodayStats(): Promise<{
    todayAvgPrice: number;
    yesterdayAvgPrice: number | null;
    difference: number | null;
    percentageChange: number | null;
  }> {
    const today = this.getKoreanDateString(new Date());
    const yesterday = this.getKoreanDateString(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );

    // 실시간 오늘의 통계 계산
    const trades = await this.prisma.trade.findMany({
      where: {
        createdAt: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(
            new Date(`${today}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000,
          ),
        },
      },
    });

    let todayStats = null;
    if (trades.length > 0) {
      const stats = trades.reduce(
        (acc, trade) => {
          if (!acc) {
            acc = {
              date: today,
              totalAmount: 0,
              totalPrice: 0,
              highPrice: trade.price,
              lowPrice: trade.price,
              closePrice: trade.price,
            };
          }

          acc.totalAmount += trade.amount;
          acc.totalPrice += trade.price * trade.amount;
          acc.highPrice = Math.max(acc.highPrice, trade.price);
          acc.lowPrice = Math.min(acc.lowPrice, trade.price);
          acc.closePrice = trade.price;

          return acc;
        },
        {
          date: today,
          totalAmount: 0,
          totalPrice: 0,
          highPrice: 0,
          lowPrice: Infinity,
          closePrice: 0,
        },
      );

      todayStats = {
        ...stats,
        averagePrice: stats.totalPrice / stats.totalAmount,
        lowPrice: stats.lowPrice === Infinity ? 0 : stats.lowPrice,
      };
    }

    const yesterdayStats = await this.prisma.dailyStats.findUnique({
      where: { date: yesterday },
    });

    if (!todayStats) {
      return {
        todayAvgPrice: 0,
        yesterdayAvgPrice: yesterdayStats ? yesterdayStats.averagePrice : null,
        difference: null,
        percentageChange: null,
      };
    }

    if (!yesterdayStats) {
      return {
        todayAvgPrice: todayStats.averagePrice,
        yesterdayAvgPrice: null,
        difference: null,
        percentageChange: null,
      };
    }

    const difference = todayStats.averagePrice - yesterdayStats.averagePrice;
    const percentageChange = (difference / yesterdayStats.averagePrice) * 100;

    return {
      todayAvgPrice: todayStats.averagePrice,
      yesterdayAvgPrice: yesterdayStats.averagePrice,
      difference,
      percentageChange,
    };
  }

  async getTodayMatch(): Promise<{
    todayAvgPrice: number;
    highestPrice: number;
    lowestPrice: number;
    totalMatchAmount: number;
  }> {
    const today = this.getKoreanDateString(new Date());
    const trades = await this.prisma.trade.findMany({
      where: {
        createdAt: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(
            new Date(`${today}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000,
          ),
        },
      },
    });

    if (trades.length === 0) {
      return {
        todayAvgPrice: 0,
        highestPrice: 0,
        lowestPrice: 0,
        totalMatchAmount: 0,
      };
    }

    const btcRate = await this.getBtcToKrwRate();
    if (!btcRate) return null;

    const stats = trades.reduce(
      (acc, trade, index) => {
        const priceInBTC = trade.price / btcRate;
        if (index === 0) {
          acc.openPrice = trade.price;
          acc.openPriceBTC = priceInBTC;
        }

        acc.totalAmount += trade.amount;
        acc.totalPrice += trade.price * trade.amount;
        acc.highPrice = Math.max(acc.highPrice, trade.price);
        acc.lowPrice = Math.min(acc.lowPrice, trade.price);
        acc.closePrice = trade.price;
        acc.highPriceBTC = Math.max(acc.highPriceBTC, priceInBTC);
        acc.lowPriceBTC = Math.min(acc.lowPriceBTC, priceInBTC);
        acc.closePriceBTC = priceInBTC;

        return acc;
      },
      {
        totalAmount: 0,
        totalPrice: 0,
        highPrice: 0,
        lowPrice: Infinity,
        closePrice: 0,
        openPrice: 0,
        openPriceBTC: 0,
        highPriceBTC: 0,
        lowPriceBTC: Infinity,
        closePriceBTC: 0,
      },
    );

    return {
      todayAvgPrice: stats.totalPrice / stats.totalAmount,
      highestPrice: stats.highPrice,
      lowestPrice: stats.lowPrice,
      totalMatchAmount: stats.totalAmount,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async handleCron() {
    await this.saveTodayStats();
  }

  async uploadDailyStats(dailyStats: DailyTradeStat[]): Promise<void> {
    for (const stats of dailyStats) {
      await this.prisma.dailyStats.upsert({
        where: { date: stats.date },
        update: stats,
        create: stats,
      });
    }
  }
}
