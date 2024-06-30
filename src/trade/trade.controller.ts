import { Controller, Post, Body, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags} from '@nestjs/swagger';
import { TradeService } from './trade.service';
import { DailyTradeStat } from './daily-trade-stat.interface';

@ApiTags('Trades')
@Controller('trades')
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Get()
  @ApiOperation({
    summary: '모든 거래 조회',
    description: '모든 거래 기록을 반환합니다.',
  })
  async getAllTrades(): Promise<any[]> {
    return this.tradeService.getAllTrades();
  }
  
  @Get('daily-stats')
  @ApiOperation({
    summary: '일별 거래 통계 조회',
    description: '저장된 매일의 평균가, 종가, 저가, 고가, 총 거래금액, 총 수량을 반환합니다.',
  })
  async getDailyTradeStats(): Promise<DailyTradeStat[]> {
    return this.tradeService.getDailyTradeStats();
  }

  @Get('paginated-daily-stats')
  @ApiOperation({
    summary: '일별 거래 통계 페이지네이션 조회',
    description: '페이지네이션된 저장된 매일의 평균가, 종가, 저가, 고가, 총 거래금액, 총 수량을 반환합니다.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page', example: 10 })
  async getPaginatedDailyTradeStats(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<DailyTradeStat[]> {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || isNaN(limitNumber)) {
      throw new BadRequestException('Page and limit must be valid numbers.');
    }

    const skip = (pageNumber - 1) * limitNumber;
    return this.tradeService.getPaginatedDailyTradeStats(skip, limitNumber);
  }

  

  @Post('save-today-stats')
  @ApiOperation({
    summary: '오늘의 거래 통계 저장',
    description: '오늘의 거래 통계를 계산하여 저장합니다.',
  })
  async saveTodayStats(): Promise<DailyTradeStat | null> {
    return this.tradeService.saveTodayStats();
  }

  @Get('today-stats')
  @ApiOperation({
    summary: '오늘의 거래 통계 조회',
    description: '오늘의 평균가, 어제 평균가와의 차이 및 증감 퍼센테이지를 반환합니다.',
  })
  async getTodayStats(): Promise<{ 
    todayAvgPrice: number; 
    yesterdayAvgPrice: number | null; 
    difference: number | null; 
    percentageChange: number | null; 
  }> {
    return this.tradeService.getTodayStats();
  }

  @Get('today-match')
  @ApiOperation({
    summary: '오늘의 거래 매칭',
    description: '오늘 평균가, 최고가, 최저가, 총 매칭금액을 계산하여 반환합니다.',
  })
  async getTodayMatch(): Promise<{ 
    todayAvgPrice: number; 
    highestPrice: number; 
    lowestPrice: number; 
    totalMatchAmount: number; 
  }> {
    return this.tradeService.getTodayMatch();
  }

  @Post('upload-daily-stats')
  @ApiOperation({
    summary: 'Upload Daily Trade Stats',
    description: 'Upload daily trade statistics from an Excel file.',
  })
  async uploadDailyStats(@Body() dailyStats: DailyTradeStat[]): Promise<void> {
    return this.tradeService.uploadDailyStats(dailyStats);
  }
}
