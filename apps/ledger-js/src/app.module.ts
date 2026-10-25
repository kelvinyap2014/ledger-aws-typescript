import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entities
import { Account } from './entity/account.entity';
import { LedgerEntry } from './entity/ledger-entry.entity';
import { IdempotencyKey } from './entity/idempotency-key.entity';

// Repositories
import { AccountRepository } from './repository/account.repository';
import { LedgerRepository } from './repository/ledger.repository';
import { IdempotencyRepository } from './repository/idempotency.repository';

// Services
import { TransferService } from './service/transfer.service';
import { StatementService } from './service/statement.service';
import { SqsSettlementPublisher } from './service/sqs-settlement-publisher.service';

// Controllers
import { TransferController } from './controller/transfer.controller';
import { StatementController } from './controller/statement.controller';

@Module({
  imports: [
    // Loads environment variables globally (.env)
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Configures MySQL database connection via TypeORM
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Account, LedgerEntry, IdempotencyKey],
      synchronize: false, // Auto-creates database tables in development (set to false for production migrations)
    }),

    // Registers entities for feature injection
    TypeOrmModule.forFeature([Account, LedgerEntry, IdempotencyKey]),
  ],
  controllers: [AppController, TransferController, StatementController],
  providers: [
    AppService,
    TransferService,
    StatementService,
    SqsSettlementPublisher,
    AccountRepository,
    LedgerRepository,
    IdempotencyRepository,
  ],
})
export class AppModule {}
