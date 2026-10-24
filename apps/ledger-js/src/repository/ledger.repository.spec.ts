import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry, EntryType } from '../entity/ledger-entry.entity';
import { LedgerRepository } from './ledger.repository';

describe('LedgerRepository', () => {
  let repository: LedgerRepository;
  let typeOrmRepository: Repository<LedgerEntry>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerRepository,
        {
          provide: getRepositoryToken(LedgerEntry),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<LedgerRepository>(LedgerRepository);
    typeOrmRepository = module.get<Repository<LedgerEntry>>(getRepositoryToken(LedgerEntry));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByTransactionReference', () => {
    it('should return ledger entries for a transaction reference', async () => {
      const txRef = 'TX-12345678';
      const entries = [
        {
          id: 'entry-1',
          transactionReference: txRef,
          entryType: EntryType.DEBIT,
          amount: '500',
          accountId: 'acc-001',
        } as LedgerEntry,
        {
          id: 'entry-2',
          transactionReference: txRef,
          entryType: EntryType.CREDIT,
          amount: '500',
          accountId: 'acc-002',
        } as LedgerEntry,
      ];

      jest.spyOn(typeOrmRepository, 'find').mockResolvedValue(entries);

      const result = await repository.findByTransactionReference(txRef);

      expect(result).toEqual(entries);
      expect(result).toHaveLength(2);
      expect(typeOrmRepository.find).toHaveBeenCalledWith({ where: { transactionReference: txRef } });
    });

    it('should return empty array if no entries found', async () => {
      const txRef = 'TX-NOTFOUND';

      jest.spyOn(typeOrmRepository, 'find').mockResolvedValue([]);

      const result = await repository.findByTransactionReference(txRef);

      expect(result).toEqual([]);
      expect(typeOrmRepository.find).toHaveBeenCalledWith({ where: { transactionReference: txRef } });
    });
  });

  describe('findByAccountId', () => {
    it('should return all ledger entries for an account', async () => {
      const accountId = 'acc-001-nzd';
      const entries = [
        {
          id: 'entry-1',
          accountId,
          entryType: EntryType.DEBIT,
          amount: '500',
          transactionReference: 'TX-111',
        } as LedgerEntry,
        {
          id: 'entry-2',
          accountId,
          entryType: EntryType.CREDIT,
          amount: '250',
          transactionReference: 'TX-222',
        } as LedgerEntry,
      ];

      jest.spyOn(typeOrmRepository, 'find').mockResolvedValue(entries);

      const result = await repository.findByAccountId(accountId);

      expect(result).toEqual(entries);
      expect(result).toHaveLength(2);
      expect(typeOrmRepository.find).toHaveBeenCalledWith({ where: { accountId } });
    });

    it('should return empty array if account has no entries', async () => {
      const accountId = 'acc-new-account';

      jest.spyOn(typeOrmRepository, 'find').mockResolvedValue([]);

      const result = await repository.findByAccountId(accountId);

      expect(result).toEqual([]);
      expect(typeOrmRepository.find).toHaveBeenCalledWith({ where: { accountId } });
    });
  });

  describe('save', () => {
    it('should save a ledger entry', async () => {
      const entry = new LedgerEntry();
      entry.id = 'entry-xyz';
      entry.transactionReference = 'TX-ABC123';
      entry.accountId = 'acc-001';
      entry.entryType = EntryType.DEBIT;
      entry.amount = '100';

      jest.spyOn(typeOrmRepository, 'save').mockResolvedValue(entry);

      const result = await repository.save(entry);

      expect(result).toEqual(entry);
      expect(typeOrmRepository.save).toHaveBeenCalledWith(entry);
    });

    it('should save both debit and credit entries', async () => {
      const debitEntry = LedgerEntry.createDebit('TX-999', 'acc-001', '500', 'NZD', 'Test debit');
      const creditEntry = LedgerEntry.createCredit('TX-999', 'acc-002', '500', 'NZD', 'Test credit');

      jest.spyOn(typeOrmRepository, 'save').mockResolvedValueOnce(debitEntry).mockResolvedValueOnce(creditEntry);

      const debitResult = await repository.save(debitEntry);
      const creditResult = await repository.save(creditEntry);

      expect(debitResult.entryType).toBe(EntryType.DEBIT);
      expect(creditResult.entryType).toBe(EntryType.CREDIT);
      expect(debitResult.transactionReference).toBe(creditResult.transactionReference);
      expect(typeOrmRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});
