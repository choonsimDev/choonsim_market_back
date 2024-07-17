import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './order.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // 현재 KST(한국 표준시) 날짜를 반환하는 함수
  getKSTDate() {
    const date = new Date();
    date.setHours(date.getHours() + 9);
    return date;
  }

  // 주어진 날짜를 KST 날짜 문자열(YYYY-MM-DD 형식)로 변환하는 함수
  private getKoreanDateString(date: Date): string {
    const koreanTimeOffset = 9 * 60 * 60 * 1000; // KST (UTC+9)
    const koreanDate = new Date(date.getTime() + koreanTimeOffset);
    return koreanDate.toISOString().split('T')[0];
  }

  // 주어진 날짜의 주문 번호를 생성하는 함수
  private async generateOrderNumber(date: string): Promise<string> {
    const startDate = new Date(`${date}T00:00:00+09:00`); // KST 기준 시작 시간
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    // 해당 날짜에 생성된 주문 수를 세기
    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // 주문 번호 생성 (YYYYMMDD0001 형식)
    const orderNumber = `${date.replace(/-/g, '')}${(count + 1)
      .toString()
      .padStart(4, '0')}`;
    return orderNumber;
  }

  // 새로운 주문을 생성하는 함수
  async createOrder(data: CreateOrderDto) {
    const createdAt = this.getKSTDate();
    const dateString = this.getKoreanDateString(createdAt);
    const orderNumber = await this.generateOrderNumber(dateString);

    // 주문 생성 및 데이터베이스에 저장
    return this.prisma.order.create({
      data: {
        ...data,
        orderNumber,
        remainingAmount: data.amount,
        status: 0,
        createdAt,
      },
    });
  }

  // 모든 주문을 가져오는 함수
  async getAllOrders() {
    return this.prisma.order.findMany();
  }

  // 오늘 날짜의 모든 주문을 가져오는 함수
  async getTodayOrders() {
    const today = this.getKoreanDateString(new Date());

    return this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(`${today}T00:00:00+09:00`), // KST 기준 시작 시간
          lt: new Date(
            new Date(`${today}T00:00:00+09:00`).getTime() + 24 * 60 * 60 * 1000,
          ),
        },
      },
    });
  }

  // 주문 상태를 업데이트하는 함수
  async updateOrderStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    const { status, cancellationReason, remainingAmount } =
      updateOrderStatusDto;
    let newStatus: number | undefined;
    let cancellationReasonUpdated: string | undefined;
    let remainingAmountUpdate: number | undefined;

    if (status !== undefined) {
      newStatus = status;

      if (newStatus === 0) {
        const order = await this.prisma.order.findUnique({
          where: { id },
          select: { amount: true },
        });

        if (order) {
          remainingAmountUpdate = order.amount;
        }
      }
      if (newStatus === 1) {
        remainingAmountUpdate = remainingAmount;
      }
    }

    if (remainingAmount !== undefined) {
      remainingAmountUpdate = remainingAmount;
    }

    if (cancellationReason !== undefined) {
      cancellationReasonUpdated = cancellationReason;
    }

    try {
      console.log(
        `Updating order ${id} with status: ${newStatus}, remainingAmount: ${remainingAmountUpdate}`,
      );
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          ...(newStatus !== undefined && { status: newStatus }),
          ...(cancellationReasonUpdated && {
            cancellationReason: cancellationReasonUpdated,
          }),
          ...(remainingAmountUpdate !== undefined && {
            remainingAmount: remainingAmountUpdate,
          }),
        },
      });
      return updatedOrder;
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }

  // 주문 매칭 로직
  async matchOrders(): Promise<void> {
    // 'BUY' 타입의 주문을 가져옴. 상태가 1이고, processed가 true인 주문을 createdAt 기준으로 오름차순 정렬
    const buyOrders = await this.prisma.order.findMany({
      where: { type: 'BUY', status: 1, processed: true },
      orderBy: { createdAt: 'asc' },
    });
    // 'SELL' 타입의 주문을 가져옴. 상태가 1이고, processed가 true인 주문을 createdAt 기준으로 오름차순 정렬
    const sellOrders = await this.prisma.order.findMany({
      where: { type: 'SELL', status: 1, processed: true },
      orderBy: { createdAt: 'asc' },
    });
    // 모든 'BUY' 주문을 순회
    for (const buyOrder of buyOrders) {
      // 모든 'SELL' 주문을 순회
      for (const sellOrder of sellOrders) {
        // 'BUY' 주문과 'SELL' 주문의 가격이 동일한 경우 매칭
        if (buyOrder.price === sellOrder.price) {
          // 매칭할 수량을 'BUY' 주문과 'SELL' 주문의 remainingAmount 중 작은 값으로 설정
          const matchAmount = Math.min(
            buyOrder.remainingAmount,
            sellOrder.remainingAmount,
          );
          // 트랜잭션으로 주문과 거래를 업데이트
          await this.prisma.$transaction(async (prisma) => {
            // 새로운 거래를 생성
            await prisma.trade.create({
              data: {
                buyOrderId: buyOrder.id,
                sellOrderId: sellOrder.id,
                amount: matchAmount,
                price: buyOrder.price,
                buyPhoneNumber: buyOrder.phoneNumber,
                buyBlockchainAddress: buyOrder.blockchainAddress,
                buyAccountNumber: buyOrder.accountNumber,
                buyNickname: buyOrder.nickname,
                sellPhoneNumber: sellOrder.phoneNumber,
                sellBlockchainAddress: sellOrder.blockchainAddress,
                sellAccountNumber: sellOrder.accountNumber,
                sellNickname: sellOrder.nickname,
                createdAt: this.getKSTDate(),
              },
            });

            // 'BUY' 주문의 상태를 2로 업데이트
            await prisma.order.update({
              where: { id: buyOrder.id },
              data: {
                status: 2,
                remainingAmount: buyOrder.remainingAmount - matchAmount,
              },
            });

            // 'SELL' 주문의 상태를 2로 업데이트
            await prisma.order.update({
              where: { id: sellOrder.id },
              data: {
                status: 2,
                remainingAmount: sellOrder.remainingAmount - matchAmount,
              },
            });
          });

          // 매칭된 후 동일한 가격의 다른 주문들은 매칭에서 제외되도록 break
          sellOrders.splice(sellOrders.indexOf(sellOrder), 1);
          // break;
        }
      }
    }
  }

  // 특정 주문을 매칭하는 함수
  async matchSpecificOrders(
    sellOrderId: string,
    buyOrderId: string,
  ): Promise<void> {
    // sellOrderId와 일치하는 판매 주문을 데이터베이스에서 찾음
    const sellOrder = await this.prisma.order.findUnique({
      where: { id: sellOrderId },
    });
    // buyOrderId와 일치하는 구매 주문을 데이터베이스에서 찾음
    const buyOrder = await this.prisma.order.findUnique({
      where: { id: buyOrderId },
    });
    // 판매 주문이나 구매 주문 중 하나라도 존재하지 않으면 에러를 발생시킴
    if (!sellOrder || !buyOrder) {
      throw new Error('One or both orders not found');
    }
    // 두 주문의 상태가 입금 완료(1)인지 확인, 아니라면 에러를 발생시킴
    if (sellOrder.status !== 1 || buyOrder.status !== 1) {
      throw new Error('Both orders must be in the "입금 완료" status');
    }
    // 구매 주문의 가격이 판매 주문의 가격보다 낮으면 에러를 발생시킴
    if (buyOrder.price < sellOrder.price) {
      throw new Error(
        'Buy order price must be greater than or equal to sell order price',
      );
    }

    // 매칭할 수량을 구매 주문과 판매 주문의 remainingAmount 중 작은 값으로 설정
    const matchAmount = Math.min(
      buyOrder.remainingAmount,
      sellOrder.remainingAmount,
    );
    await this.prisma.$transaction(async (prisma) => {
      await prisma.trade.create({
        data: {
          buyOrderId: buyOrder.id,
          sellOrderId: sellOrder.id,
          amount: matchAmount,
          price: buyOrder.price,
          buyPhoneNumber: buyOrder.phoneNumber,
          buyBlockchainAddress: buyOrder.blockchainAddress,
          buyAccountNumber: buyOrder.accountNumber,
          buyNickname: buyOrder.nickname,
          sellPhoneNumber: sellOrder.phoneNumber,
          sellBlockchainAddress: sellOrder.blockchainAddress,
          sellAccountNumber: sellOrder.accountNumber,
          sellNickname: sellOrder.nickname,
          createdAt: this.getKSTDate(),
        },
      });
      // 구매 주문의 remainingAmount를 업데이트

      await prisma.order.update({
        where: { id: buyOrder.id },
        data: { remainingAmount: buyOrder.remainingAmount - matchAmount },
      });
      // 판매 주문의 remainingAmount를 업데이트

      await prisma.order.update({
        where: { id: sellOrder.id },
        data: { remainingAmount: sellOrder.remainingAmount - matchAmount },
      });
      // 구매 주문이 완전히 매칭된 경우 상태를 3로 업데이트
      if (buyOrder.remainingAmount - matchAmount === 0) {
        await prisma.order.update({
          where: { id: buyOrder.id },
          data: { status: 3 },
        });
      }
      // 판매 주문이 완전히 매칭된 경우 상태를 3로 업데이트
      if (sellOrder.remainingAmount - matchAmount === 0) {
        await prisma.order.update({
          where: { id: sellOrder.id },
          data: { status: 3 },
        });
      }
    });
  }
  // 특정 상태의 주문을 가져오는 함수
  async getOrdersByStatus(status: number) {
    // 상태가 status인 주문을 데이터베이스에서 찾음
    return this.prisma.order.findMany({
      where: { status },
    });
  }

  // 특정 주문의 처리 상태를 업데이트하는 함수
  async processOrder(id: string, processed: boolean): Promise<Order> {
    // id와 일치하는 주문의 처리 상태를 processed로 업데이트
    return this.prisma.order.update({
      where: { id },
      data: { processed },
    });
  }
}
