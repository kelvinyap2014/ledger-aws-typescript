import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Account } from './entity/account.entity';
import { LedgerEntry } from './entity/ledger-entry.entity';
import { IdempotencyKey } from './entity/idempotency-key.entity';

config(); // Loads environment variables from .env

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Account, LedgerEntry, IdempotencyKey],
  migrations: ['dist/migration/*.js'],
  synchronize: false,
});
