import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { LedgerEntry } from './ledger-entry.entity';

@Entity('accounts')
export class Account {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'account_number', type: 'varchar', length: 34, unique: true, nullable: false })
  accountNumber: string;

  @Column({ name: 'holder_name', type: 'varchar', length: 100, nullable: false })
  holderName: string;

  @Column({ type: 'varchar', length: 3, nullable: false, default: 'NZD' })
  currency: string;

  @Column({ type: 'decimal', precision: 19, scale: 4, nullable: false, default: '0.0000' })
  balance: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => LedgerEntry, (ledgerEntry) => ledgerEntry.account)
  ledgerEntries: LedgerEntry[];
}
