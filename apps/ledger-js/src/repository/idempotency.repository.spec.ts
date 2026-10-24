import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyKey } from '../entity/idempotency-key.entity';
import { IdempotencyRepository } from './idempotency.repository';

describe('IdempotencyRepository', () => {
  let repository: IdempotencyRepository;
  let typeOrmRepository: Repository<IdempotencyKey>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyRepository,
        {
          provide: getRepositoryToken(IdempotencyKey),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<IdempotencyRepository>(IdempotencyRepository);
    typeOrmRepository = module.get<Repository<IdempotencyKey>>(getRepositoryToken(IdempotencyKey));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return an idempotency key record', async () => {
      const keyStr = 'uuid-1234-5678';
      const record = new IdempotencyKey();
      record.idempotencyKey = keyStr;
      record.responseBody = 'TX-ABC123';
      record.requestHash = 'hash-value';

      jest.spyOn(typeOrmRepository, 'findOne').mockResolvedValue(record);

      const result = await repository.findById(keyStr);

      expect(result).toEqual(record);
      expect(result.responseBody).toBe('TX-ABC123');
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({ where: { idempotencyKey: keyStr } });
    });

    it('should return null if key not found', async () => {
      const keyStr = 'uuid-not-found';

      jest.spyOn(typeOrmRepository, 'findOne').mockResolvedValue(null);

      const result = await repository.findById(keyStr);

      expect(result).toBeNull();
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({ where: { idempotencyKey: keyStr } });
    });
  });

  describe('save', () => {
    it('should save an idempotency key record', async () => {
      const record = new IdempotencyKey();
      record.idempotencyKey = 'uuid-9876';
      record.responseBody = 'TX-XYZ789';
      record.requestHash = 'hash-xyz';

      jest.spyOn(typeOrmRepository, 'save').mockResolvedValue(record);

      const result = await repository.save(record);

      expect(result).toEqual(record);
      expect(result.idempotencyKey).toBe('uuid-9876');
      expect(result.responseBody).toBe('TX-XYZ789');
      expect(typeOrmRepository.save).toHaveBeenCalledWith(record);
    });

    it('should persist the created timestamp', async () => {
      const record = new IdempotencyKey();
      record.idempotencyKey = 'uuid-timestamp-test';
      record.responseBody = 'TX-TIMESTAMP';
      record.requestHash = 'hash-ts';
      record.createdAt = new Date('2026-10-25T12:00:00Z');

      jest.spyOn(typeOrmRepository, 'save').mockResolvedValue(record);

      const result = await repository.save(record);

      expect(result.createdAt).toEqual(new Date('2026-10-25T12:00:00Z'));
      expect(typeOrmRepository.save).toHaveBeenCalledWith(record);
    });
  });
});
