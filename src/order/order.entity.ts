import { Order as PrismaOrder } from '@prisma/client';

export class Order implements PrismaOrder {
  id: string;
  type: string;
  amount: number;
  remainingAmount: number;
  price: number;
  phoneNumber: string;
  blockchainAddress: string;
  accountNumber: string;
  nickname: string;
  username: string;
  status: number;
  createdAt: Date;
  updatedAt: Date;
  cancellationReason: string | null;
  bankName: string;
  processed: boolean;
  orderNumber: string;
}
