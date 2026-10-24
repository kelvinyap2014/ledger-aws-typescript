import { Controller, Post, Body, Headers, HttpStatus, HttpCode } from '@nestjs/common';
import { TransferService } from '../service/transfer.service';
import { TransferRequestDto } from './dto/transfer-request.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('transfers')
@Controller('api/v1/transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Execute a double-entry fund transfer' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Unique key to ensure idempotent request execution' })
  @ApiResponse({ status: 201, description: 'Transfer executed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request, validation error, or insufficient funds' })
  async executeTransfer(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() request: TransferRequestDto,
  ): Promise<Record<string, any>> {
    const txRef = await this.transferService.executeTransfer(
      idempotencyKey,
      request.sourceAccountId,
      request.destinationAccountId,
      request.amount.toString(),
      request.currency,
      request.description ?? '',
    );

    return {
      status: 'SUCCESS',
      transactionReference: txRef,
      idempotencyKey: idempotencyKey ?? 'NONE',
    };
  }
}
