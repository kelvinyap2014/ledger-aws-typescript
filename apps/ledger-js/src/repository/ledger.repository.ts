import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '../entity/ledger-entry.entity';

@Injectable()
export class LedgerRepository {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly repo: Repository<LedgerEntry>,
  ) {}

  async findByTransactionReference(transactionReference: string): Promise<LedgerEntry[]> {
    return this.repo.find({ where: { transactionReference } });
  }

  async findByAccountId(accountId: string): Promise<LedgerEntry[]> {
    return this.repo.find({ where: { accountId } });
  }

  async save(ledgerEntry: LedgerEntry): Promise<LedgerEntry> {
    return this.repo.save(ledgerEntry);
  }
}
