import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { LedgerRepository } from '../repository/ledger.repository';
import { LedgerEntry } from '../entity/ledger-entry.entity';

@Injectable()
export class StatementService {
  private readonly logger = new Logger(StatementService.name);
  private readonly s3Client: S3Client;
  private readonly auditBucketName: string;

  constructor(
    private readonly ledgerRepository: LedgerRepository,
    private readonly configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
    });
    this.auditBucketName = this.configService.get<string>('AWS_S3_AUDIT_BUCKET_NAME') ?? '';
  }

  async generateOrGetStatementPresignedUrl(accountId: string): Promise<string> {
    const dateStr = new Date().toISOString().split('T')[0];
    const objectKey = `statements/${accountId}/statement-${dateStr}.csv`;

    // 1. Fetch transaction history from PostgreSQL for the account
    const entries: LedgerEntry[] = await this.ledgerRepository.findByAccountId(accountId);

    // 2. Generate statement content dynamically (CSV format)
    const csvContent = this.buildCsvStatement(accountId, entries);

    // 3. Upload generated statement directly to S3
    this.logger.log(`Uploading generated statement for account ${accountId} to S3 bucket ${this.auditBucketName}`);

    const putCommand = new PutObjectCommand({
      Bucket: this.auditBucketName,
      Key: objectKey,
      ContentType: 'text/csv',
      Body: csvContent,
    });

    await this.s3Client.send(putCommand);

    // 4. Generate 15-minute Presigned Download URL
    const getCommand = new GetObjectCommand({
      Bucket: this.auditBucketName,
      Key: objectKey,
    });

    const presignedUrl = await getSignedUrl(this.s3Client, getCommand, { expiresIn: 900 });
    return presignedUrl;
  }

  private buildCsvStatement(accountId: string, entries: LedgerEntry[]): string {
    const header = 'Account ID,Entry ID,Type,Amount,Currency,Timestamp\n';
    let rows = '';

    if (!entries || entries.length === 0) {
      const now = new Date().toISOString();
      rows = `${accountId},N/A,NO_TRANSACTIONS,0.00,NZD,${now}\n`;
    } else {
      for (const entry of entries) {
        rows += `${entry.accountId},${entry.id},${entry.entryType},${entry.amount},${entry.currency},${entry.createdAt}\n`;
      }
    }

    return header + rows;
  }
}
