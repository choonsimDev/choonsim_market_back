import { ApiProperty } from '@nestjs/swagger';
import { OrderType } from '../order.enum';

export class CreateOrderDto {
  @ApiProperty({ example: 'BUY' })
  type: OrderType;

  @ApiProperty({ example: 10 })
  amount: number;

  @ApiProperty({ example: 100 })
  price: number;

  @ApiProperty({ example: '010-1234-5678' })
  phoneNumber: string;

  @ApiProperty({ example: '0xabc123...' })
  blockchainAddress: string;

  @ApiProperty({ example: '123-456-7890' })
  accountNumber: string;

  @ApiProperty({ example: 'seller123' })
  nickname: string;

  @ApiProperty({ example: '남정현' })
  username: string;

  @ApiProperty({ example: '신한은행' })
  bankName: string;
}
