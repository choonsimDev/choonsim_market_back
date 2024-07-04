import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { Order } from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { MatchOrderDto } from './dto/match-order.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({
    summary: '새 주문 생성',
    description: '매수 또는 매도 주문을 생성합니다.',
  })
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
  }

  // @UseGuards(JwtGuard)
  @Get()
  @ApiOperation({
    summary: '모든 주문 조회',
    description: '모든 주문 목록을 반환합니다.',
  })
  async getAllOrders() {
    return this.orderService.getAllOrders();
  }

  @Get('today')
  @ApiOperation({
    summary: '오늘 생성된 모든 주문 조회',
    description: '오늘 생성된 모든 주문 목록을 반환합니다.',
  })
  async getTodayOrders() {
    return this.orderService.getTodayOrders();
  }

  @Get('status/:status')
  @ApiOperation({
    summary: '상태별 주문 조회',
    description: '주어진 상태에 따른 주문 목록을 반환합니다.',
  })
  async getOrdersByStatus(@Param('status', ParseIntPipe) status: number) {
    return this.orderService.getOrdersByStatus(status);
  }

  @UseGuards(JwtGuard)
  @Post('match')
  @ApiOperation({
    summary: '주문 매칭',
    description:
      '가격과 수량을 기준으로 매수 및 매도 주문을 자동으로 매칭합니다.',
  })
  async matchOrders(): Promise<void> {
    return this.orderService.matchOrders();
  }

  @UseGuards(JwtGuard)
  @Patch(':id/status')
  @ApiOperation({
    summary: '주문 상태 업데이트',
    description: '주문의 상태를 업데이트합니다.',
  })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderStatus: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(id, updateOrderStatus);
  }

  @UseGuards(JwtGuard)
  @Post('match-order')
  @ApiOperation({
    summary: '특정 주문 매칭',
    description:
      '제공된 ID를 기반으로 특정 매수 주문과 매도 주문을 매칭합니다.',
  })
  async matchSpecificOrders(
    @Body() matchOrderDto: MatchOrderDto,
  ): Promise<void> {
    return this.orderService.matchSpecificOrders(
      matchOrderDto.sellOrderId,
      matchOrderDto.buyOrderId,
    );
  }

  @UseGuards(JwtGuard)
  @Put(':id/process')
  @ApiOperation({
    summary: '주문 처리 상태 변경',
    description: '주문 처리 상태를 변경합니다.',
  })
  async processOrder(
    @Param('id') id: string,
    @Body() body: { processed: boolean },
  ): Promise<Order> {
    return this.orderService.processOrder(id, body.processed);
  }
}
