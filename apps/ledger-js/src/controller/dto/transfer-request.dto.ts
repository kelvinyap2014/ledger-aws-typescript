import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferRequestDto {
  @ApiProperty({ example: 'acc-uuid-source-123' })
  @IsNotEmpty()
  @IsString()
  sourceAccountId: string;

  @ApiProperty({ example: 'acc-uuid-dest-456' })
  @IsNotEmpty()
  @IsString()
  destinationAccountId: string;

  @ApiProperty({ example: 100.50 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.0001)
  amount: number;

  @ApiProperty({ example: 'NZD' })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiPropertyOptional({ example: 'Monthly invoice settlement' })
  @IsOptional()
  @IsString()
  description?: string;
}
