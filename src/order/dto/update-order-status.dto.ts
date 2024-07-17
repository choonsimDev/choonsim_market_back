import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 0 }) // 0: 입금 대기중, 1: 입금 완료 및 매칭 대기중, 2: 매칭 완료 3: 주문 취소
  @IsOptional()
  status?: number;

  @ApiProperty({ example: 'Customer requested cancellation', required: false })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  remainingAmount?: number;
}
