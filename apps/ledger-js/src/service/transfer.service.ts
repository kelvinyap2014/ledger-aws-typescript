import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Account } from '../entity/account.entity';
import { LedgerEntry } from '../entity/ledger-entry.entity';
import { IdempotencyKey } from '../entity/idempotency-key.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(private readonly dataSource: DataSource) {}

  async executeTransfer(
    idempotencyKeyStr: string | undefined,
    sourceAccountId: string,
    destinationAccountId: string,
    amount: string,
    currency: string,
    description: string,
  ): Promise<string> {
    this.logger.log(`Begin transfer from ${sourceAccountId} to ${destinationAccountId} of amount ${amount} ${currency}`);

    if (idempotencyKeyStr && idempotencyKeyStr.trim() !== '') {
      const existingKey = await this.dataSource.getRepository(IdempotencyKey).findOne({
        where: { idempotencyKey: idempotencyKeyStr },
      });
      if (existingKey) {
        return existingKey.responseBody;
      }
    }

    if (Number(amount) <= 0) {
      throw new BadRequestException('Transfer amount must be strictly positive');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sourceAccount = await queryRunner.manager.findOne(Account, {
        where: { id: sourceAccountId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sourceAccount) {
        throw new BadRequestException(`Source account not found: ${sourceAccountId}`);
      }

      const destAccount = await queryRunner.manager.findOne(Account, {
        where: { id: destinationAccountId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!destAccount) {
        throw new BadRequestException(`Destination account not found: ${destinationAccountId}`);
      }

      if (Number(sourceAccount.balance) < Number(amount)) {
        throw new BadRequestException('Insufficient funds in source account');
      }

      const txRef = 'TX-' + randomUUID().substring(0, 8).toUpperCase();

      const debitEntry = LedgerEntry.createDebit(txRef, sourceAccountId, amount, currency, description);
      const creditEntry = LedgerEntry.createCredit(txRef, destinationAccountId, amount, currency, description);

      await queryRunner.manager.save(LedgerEntry, [debitEntry, creditEntry]);

      sourceAccount.balance = (Number(sourceAccount.balance) - Number(amount)).toFixed(4);
      destAccount.balance = (Number(destAccount.balance) + Number(amount)).toFixed(4);

      const now = new Date();
      sourceAccount.updatedAt = now;
      destAccount.updatedAt = now;

      await queryRunner.manager.save(Account, [sourceAccount, destAccount]);

      if (idempotencyKeyStr && idempotencyKeyStr.trim() !== '') {
        const keyRecord = queryRunner.manager.create(IdempotencyKey, {
          idempotencyKey: idempotencyKeyStr,
          requestHash: sourceAccountId + destinationAccountId + amount,
          responseBody: txRef,
          createdAt: new Date(),
        });
        await queryRunner.manager.save(IdempotencyKey, keyRecord);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `End transfer from ${sourceAccountId} to ${destinationAccountId} of amount ${amount} ${currency}, transaction reference: ${txRef}`
      );

      return txRef;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
