import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SettlementEvent } from '../domain/settlement-event';

@Injectable()
export class SqsSettlementPublisher {
  private readonly logger = new Logger(SqsSettlementPublisher.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.sqsClient = new SQSClient({
      region: this.configService.get<string>('AWS_REGION'),
    });
    this.queueUrl = this.configService.get<string>('SQS_SETTLEMENT_QUEUE_URL') ?? '';
  }

  async publish(event: SettlementEvent): Promise<void> {
    this.logger.log(`Publishing settlement event to SQS Queue: ${this.queueUrl}`);
    try {
      const messageBody = JSON.stringify(event);

      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: messageBody,
      });

      await this.sqsClient.send(command);
      this.logger.log(`Published settlement event to SQS for transaction: ${event.transactionReference}`);
    } catch (e) {
      this.logger.error('Failed to publish settlement event to SQS', e);
    }
  }
}
