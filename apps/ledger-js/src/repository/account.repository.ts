import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entity/account.entity';

@Injectable()
export class AccountRepository {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  /**
   * Equivalent to Spring Data JPA @Lock(LockModeType.PESSIMISTIC_WRITE)
   */
  async findByIdForUpdate(id: string): Promise<Account | null> {
    return this.repo.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async findById(id: string): Promise<Account | null> {
    return this.repo.findOne({ where: { id } });
  }

  async save(account: Account): Promise<Account> {
    return this.repo.save(account);
  }
}
