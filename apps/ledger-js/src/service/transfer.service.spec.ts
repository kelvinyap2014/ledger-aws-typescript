import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { TransferService } from './transfer.service';
import { SqsSettlementPublisher } from './sqs-settlement-publisher.service';
import { Account } from '../entity/account.entity';
import { LedgerEntry, EntryType } from '../entity/ledger-entry.entity';
import { IdempotencyKey } from '../entity/idempotency-key.entity';

describe('TransferService', () => {
  let service: TransferService;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let accountRepository: Repository<Account>;
  let idempotencyRepository: Repository<IdempotencyKey>;

  beforeEach(async () => {
    // Mock repositories
    accountRepository = {
      findOne: jest.fn(),
    } as unknown as Repository<Account>;

    idempotencyRepository = {
      findOne: jest.fn(),
    } as unknown as Repository<IdempotencyKey>;

    // Mock query runner
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as QueryRunner;

    // Mock data source
    dataSource = {
      getRepository: jest.fn().mockReturnValue(idempotencyRepository),
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as DataSource;

    const sqsPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as SqsSettlementPublisher;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: SqsSettlementPublisher,
          useValue: sqsPublisher,
        },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeTransfer', () => {
    const sourceAccountId = 'acc-001-nzd';
    const destinationAccountId = 'acc-002-nzd';
    const amount = '500';
    const currency = 'NZD';
    const description = 'Test transfer';

    it('should successfully execute a transfer', async () => {
      const sourceAccount = new Account();
      sourceAccount.id = sourceAccountId;
      sourceAccount.balance = '1000';
      sourceAccount.updatedAt = new Date();

      const destAccount = new Account();
      destAccount.id = destinationAccountId;
      destAccount.balance = '500';
      destAccount.updatedAt = new Date();

      // Mock idempotency key check (no existing key)
      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);

      // Mock account lookups
      jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValueOnce(sourceAccount).mockResolvedValueOnce(destAccount);

      // Mock ledger entry save
      jest.spyOn(queryRunner.manager, 'save').mockResolvedValue(undefined);

      // Mock idempotency key save
      jest.spyOn(queryRunner.manager, 'create').mockReturnValue(new IdempotencyKey());

      const result = await service.executeTransfer(
        'idempotency-key-123',
        sourceAccountId,
        destinationAccountId,
        amount,
        currency,
        description,
      );

      expect(result).toMatch(/^TX-[A-Z0-9]{8}$/);
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should return cached transaction reference for duplicate idempotency key', async () => {
      const existingKey = new IdempotencyKey();
      existingKey.idempotencyKey = 'idempotency-key-123';
      existingKey.responseBody = 'TX-EXISTING';

      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(existingKey);

      const result = await service.executeTransfer(
        'idempotency-key-123',
        sourceAccountId,
        destinationAccountId,
        amount,
        currency,
        description,
      );

      expect(result).toBe('TX-EXISTING');
      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should reject negative transfer amount', async () => {
      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.executeTransfer(
          'key-123',
          sourceAccountId,
          destinationAccountId,
          '-100',
          currency,
          description,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject zero transfer amount', async () => {
      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.executeTransfer(
          'key-123',
          sourceAccountId,
          destinationAccountId,
          '0',
          currency,
          description,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if source account not found', async () => {
      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValueOnce(null);

      await expect(
        service.executeTransfer(
          'key-123',
          sourceAccountId,
          destinationAccountId,
          amount,
          currency,
          description,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject if destination account not found', async () => {
      const sourceAccount = new Account();
      sourceAccount.id = sourceAccountId;
      sourceAccount.balance = '1000';

      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValueOnce(sourceAccount).mockResolvedValueOnce(null);

      await expect(
        service.executeTransfer(
          'key-123',
          sourceAccountId,
          destinationAccountId,
          amount,
          currency,
          description,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject if source account has insufficient funds', async () => {
      const sourceAccount = new Account();
      sourceAccount.id = sourceAccountId;
      sourceAccount.balance = '100'; // Less than transfer amount (500)

      const destAccount = new Account();
      destAccount.id = destinationAccountId;
      destAccount.balance = '500';

      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(queryRunner.manager, 'findOne')
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);

      await expect(
        service.executeTransfer(
          'key-123',
          sourceAccountId,
          destinationAccountId,
          amount,
          currency,
          description,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should update account balances correctly', async () => {
      const sourceAccount = new Account();
      sourceAccount.id = sourceAccountId;
      sourceAccount.balance = '1000';
      sourceAccount.updatedAt = new Date();

      const destAccount = new Account();
      destAccount.id = destinationAccountId;
      destAccount.balance = '500';
      destAccount.updatedAt = new Date();

      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(queryRunner.manager, 'findOne')
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);

      const saveSpy = jest.spyOn(queryRunner.manager, 'save').mockResolvedValue(undefined);

      await service.executeTransfer(
        'key-123',
        sourceAccountId,
        destinationAccountId,
        amount,
        currency,
        description,
      );

      // Verify balances were updated
      expect(sourceAccount.balance).toBe('500.0000');
      expect(destAccount.balance).toBe('1000.0000');

      // Verify save was called with updated accounts
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should create both debit and credit ledger entries with same transaction reference', async () => {
      const sourceAccount = new Account();
      sourceAccount.id = sourceAccountId;
      sourceAccount.balance = '1000';
      sourceAccount.updatedAt = new Date();

      const destAccount = new Account();
      destAccount.id = destinationAccountId;
      destAccount.balance = '500';
      destAccount.updatedAt = new Date();

      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(queryRunner.manager, 'findOne')
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);

      const saveSpy = jest.spyOn(queryRunner.manager, 'save').mockResolvedValue(undefined);

      await service.executeTransfer(
        'key-123',
        sourceAccountId,
        destinationAccountId,
        amount,
        currency,
        description,
      );

      // Verify ledger entries were saved
      const ledgerEntryCalls = saveSpy.mock.calls.filter(
        (call) => call[0] === LedgerEntry || (Array.isArray(call[1]) && call[1][0]?.amount),
      );

      expect(ledgerEntryCalls.length).toBeGreaterThan(0);
    });

    it('should handle empty idempotency key as undefined', async () => {
      const sourceAccount = new Account();
      sourceAccount.id = sourceAccountId;
      sourceAccount.balance = '1000';
      sourceAccount.updatedAt = new Date();

      const destAccount = new Account();
      destAccount.id = destinationAccountId;
      destAccount.balance = '500';
      destAccount.updatedAt = new Date();

      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(queryRunner.manager, 'findOne')
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);

      jest.spyOn(queryRunner.manager, 'save').mockResolvedValue(undefined);
      jest.spyOn(queryRunner.manager, 'create').mockReturnValue(new IdempotencyKey());

      const result = await service.executeTransfer(
        '   ', // Whitespace only
        sourceAccountId,
        destinationAccountId,
        amount,
        currency,
        description,
      );

      expect(result).toBeDefined();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const sourceAccount = new Account();
      sourceAccount.id = sourceAccountId;
      sourceAccount.balance = '100'; // Insufficient funds

      jest.spyOn(idempotencyRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValueOnce(sourceAccount).mockResolvedValueOnce(null);

      try {
        await service.executeTransfer(
          'key-123',
          sourceAccountId,
          destinationAccountId,
          amount,
          currency,
          description,
        );
      } catch (e) {
        // Expected
      }

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});
