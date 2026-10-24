import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entity/account.entity';
import { AccountRepository } from './account.repository';

describe('AccountRepository', () => {
  let repository: AccountRepository;
  let typeOrmRepository: Repository<Account>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountRepository,
        {
          provide: getRepositoryToken(Account),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<AccountRepository>(AccountRepository);
    typeOrmRepository = module.get<Repository<Account>>(getRepositoryToken(Account));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return an account by id', async () => {
      const accountId = 'acc-001-nzd';
      const account = new Account();
      account.id = accountId;
      account.balance = '1000';

      jest.spyOn(typeOrmRepository, 'findOne').mockResolvedValue(account);

      const result = await repository.findById(accountId);

      expect(result).toEqual(account);
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({ where: { id: accountId } });
    });

    it('should return null if account not found', async () => {
      const accountId = 'acc-nonexistent';

      jest.spyOn(typeOrmRepository, 'findOne').mockResolvedValue(null);

      const result = await repository.findById(accountId);

      expect(result).toBeNull();
    });
  });

  describe('findByIdForUpdate', () => {
    it('should return an account with pessimistic write lock', async () => {
      const accountId = 'acc-001-nzd';
      const account = new Account();
      account.id = accountId;
      account.balance = '1000';

      jest.spyOn(typeOrmRepository, 'findOne').mockResolvedValue(account);

      const result = await repository.findByIdForUpdate(accountId);

      expect(result).toEqual(account);
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: accountId },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('should return null if account not found with lock', async () => {
      const accountId = 'acc-nonexistent';

      jest.spyOn(typeOrmRepository, 'findOne').mockResolvedValue(null);

      const result = await repository.findByIdForUpdate(accountId);

      expect(result).toBeNull();
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: accountId },
        lock: { mode: 'pessimistic_write' },
      });
    });
  });

  describe('save', () => {
    it('should save an account', async () => {
      const account = new Account();
      account.id = 'acc-001-nzd';
      account.balance = '500';

      jest.spyOn(typeOrmRepository, 'save').mockResolvedValue(account);

      const result = await repository.save(account);

      expect(result).toEqual(account);
      expect(typeOrmRepository.save).toHaveBeenCalledWith(account);
    });

    it('should update balance on save', async () => {
      const account = new Account();
      account.id = 'acc-001-nzd';
      account.balance = '1500';

      jest.spyOn(typeOrmRepository, 'save').mockResolvedValue(account);

      const result = await repository.save(account);

      expect(result.balance).toBe('1500');
      expect(typeOrmRepository.save).toHaveBeenCalledWith(account);
    });
  });
});
