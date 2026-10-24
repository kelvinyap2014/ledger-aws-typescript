import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryColumn({ name: 'idempotency_key', type: 'varchar', length: 100 })
  idempotencyKey: string;

  @Column({ name: 'request_hash', type: 'varchar', length: 64, nullable: false })
  requestHash: string;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
