import { ApiProperty } from '@nestjs/swagger';

export class MatchOrderDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  sellOrderId: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  buyOrderId: string;
}
