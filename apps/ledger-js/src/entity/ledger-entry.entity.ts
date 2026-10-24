import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from './account.entity';
import { randomUUID } from 'crypto';

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 50, nullable: false })
  transactionReference: string;

  @Column({ name: 'account_id', type: 'varchar', length: 36, nullable: false })
  accountId: string;

  @Column({ type: 'enum', enum: EntryType, name: 'entry_type', nullable: false })
  entryType: EntryType;

  @Column({ type: 'decimal', precision: 19, scale: 4, nullable: false })
  amount: string;

  @Column({ type: 'varchar', length: 3, nullable: false, default: 'NZD' })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => Account, (account) => account.ledgerEntries, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  static createDebit(txRef: string, accountId: string, amount: string, currency: string, desc: string): LedgerEntry {
    const entry = new LedgerEntry();
    entry.id = randomUUID();
    entry.transactionReference = txRef;
    entry.accountId = accountId;
    entry.entryType = EntryType.DEBIT;
    entry.amount = amount;
    entry.currency = currency;
    entry.description = desc;
    entry.createdAt = new Date();
    return entry;
  }

  static createCredit(txRef: string, accountId: string, amount: string, currency: string, desc: string): LedgerEntry {
    const entry = new LedgerEntry();
    entry.id = randomUUID();
    entry.transactionReference = txRef;
    entry.accountId = accountId;
    entry.entryType = EntryType.CREDIT;
    entry.amount = amount;
    entry.currency = currency;
    entry.description = desc;
    entry.createdAt = new Date();
    return entry;
  }
}
