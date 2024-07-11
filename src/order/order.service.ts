import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './order.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  getKSTDate() {
    const date = new Date();
    date.setHours(date.getHours() + 9);
    return date;
  }

  private getKoreanDateString(date: Date): string {
    const koreanTimeOffset = 9 * 60 * 60 * 1000; // KST (UTC+9)
    const koreanDate = new Date(date.getTime() + koreanTimeOffset);
    return koreanDate.toISOString().split('T')[0];
  }

  private async generateOrderNumber(date: string): Promise<string> {
    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const orderNumber = `${date.replace(/-/g, '')}${(count + 1)
      .toString()
      .padStart(4, '0')}`;
    return orderNumber;
  }

  async createOrder(data: CreateOrderDto) {
    const createdAt = this.getKSTDate();
    const dateString = this.getKoreanDateString(createdAt);
    const orderNumber = await this.generateOrderNumber(dateString);

    return this.prisma.order.create({
      data: {
        ...data,
        orderNumber, // 생성된 orderNumber를 추가
        remainingAmount: data.amount,
        status: 0,
        createdAt,
      },
    });
  }

  async getAllOrders() {
    return this.prisma.order.findMany();
  }

  async getTodayOrders() {
    const today = this.getKoreanDateString(new Date());

    return this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(
            new Date(`${today}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000,
          ),
        },
        // 상태 필터링을 제거합니다.
      },
    });
  }

  async updateOrderStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    const { status, cancellationReason } = updateOrderStatusDto;
    let newStatus: number | undefined;
    let cancellationReasonUpdated: string | undefined;
    let remainingAmountUpdate: number | undefined;

    if (status !== undefined) {
      newStatus = status;

      // If the status is 0, reset the remainingAmount to amount
      if (newStatus === 0) {
        const order = await this.prisma.order.findUnique({
          where: { id },
          select: { amount: true },
        });

        if (order) {
          remainingAmountUpdate = order.amount;
        }
      } else if (newStatus === 2) {
        // If the status is 2, set remainingAmount to 0
        remainingAmountUpdate = 0;
      }
    }

    if (cancellationReason !== undefined) {
      cancellationReasonUpdated = cancellationReason;
    }

    try {
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

  async matchOrders(): Promise<void> {
    const buyOrders = await this.prisma.order.findMany({
      where: { type: 'BUY', status: 1, processed: true },
      orderBy: { createdAt: 'asc' },
    });
    const sellOrders = await this.prisma.order.findMany({
      where: { type: 'SELL', status: 1, processed: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const buyOrder of buyOrders) {
      for (const sellOrder of sellOrders) {
        if (buyOrder.price === sellOrder.price) {
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

            await prisma.order.update({
              where: { id: buyOrder.id },
              data: { remainingAmount: buyOrder.remainingAmount - matchAmount },
            });

            await prisma.order.update({
              where: { id: sellOrder.id },
              data: {
                remainingAmount: sellOrder.remainingAmount - matchAmount,
              },
            });

            if (matchAmount !== 0) {
              await prisma.order.update({
                where: { id: buyOrder.id },
                data: { processed: false }, // processed false for partial match
              });
              await prisma.order.update({
                where: { id: sellOrder.id },
                data: { processed: false }, // processed true when completely matched
              });
            }
          });

          if (buyOrder.remainingAmount - matchAmount === 0) {
            break;
          }
        }
      }
    }
  }

  async matchSpecificOrders(
    sellOrderId: string,
    buyOrderId: string,
  ): Promise<void> {
    const sellOrder = await this.prisma.order.findUnique({
      where: { id: sellOrderId },
    });
    const buyOrder = await this.prisma.order.findUnique({
      where: { id: buyOrderId },
    });

    if (!sellOrder || !buyOrder) {
      throw new Error('One or both orders not found');
    }

    if (sellOrder.status !== 1 || buyOrder.status !== 1) {
      throw new Error('Both orders must be in the "입금 완료" status');
    }

    if (buyOrder.price < sellOrder.price) {
      throw new Error(
        'Buy order price must be greater than or equal to sell order price',
      );
    }

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

      await prisma.order.update({
        where: { id: buyOrder.id },
        data: { remainingAmount: buyOrder.remainingAmount - matchAmount },
      });

      await prisma.order.update({
        where: { id: sellOrder.id },
        data: { remainingAmount: sellOrder.remainingAmount - matchAmount },
      });

      if (buyOrder.remainingAmount - matchAmount === 0) {
        await prisma.order.update({
          where: { id: buyOrder.id },
          data: { status: 2 },
        });
      }

      if (sellOrder.remainingAmount - matchAmount === 0) {
        await prisma.order.update({
          where: { id: sellOrder.id },
          data: { status: 2 },
        });
      }
    });
  }

  async getOrdersByStatus(status: number) {
    return this.prisma.order.findMany({
      where: { status },
    });
  }

  async processOrder(id: string, processed: boolean): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: { processed },
    });
  }
}
