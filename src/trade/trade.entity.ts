import { Trade as PrismaTrade } from '@prisma/client';

export class Trade implements PrismaTrade {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  amount: number;
  price: number;
  buyPhoneNumber: string;
  buyBlockchainAddress: string;
  buyAccountNumber: string;
  buyNickname: string;
  sellPhoneNumber: string;
  sellBlockchainAddress: string;
  sellAccountNumber: string;
  sellNickname: string;
  createdAt: Date;
}
