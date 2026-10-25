import { Controller, Get, Param } from '@nestjs/common';
import { StatementService } from '../service/statement.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('accounts')
@Controller('api/v1/accounts')
export class StatementController {
  constructor(private readonly statementService: StatementService) {}

  @Get(':id/statement/url')
  @ApiOperation({ summary: 'Generate or get a presigned URL for account statement CSV' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
  async getStatementUrl(@Param('id') accountId: string): Promise<Record<string, string>> {
    const presignedUrl = await this.statementService.generateOrGetStatementPresignedUrl(accountId);

    return {
      accountId,
      statementUrl: presignedUrl,
      expiresInMinutes: '15',
    };
  }
}
