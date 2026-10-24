import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyKey } from '../entity/idempotency-key.entity';

@Injectable()
export class IdempotencyRepository {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repo: Repository<IdempotencyKey>,
  ) {}

  async findById(idempotencyKey: string): Promise<IdempotencyKey | null> {
    return this.repo.findOne({ where: { idempotencyKey } });
  }

  async save(idempotencyKey: IdempotencyKey): Promise<IdempotencyKey> {
    return this.repo.save(idempotencyKey);
  }
}
