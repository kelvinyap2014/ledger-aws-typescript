import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { TransferController } from './transfer.controller';
import { TransferService } from '../service/transfer.service';
import { TransferRequestDto } from './dto/transfer-request.dto';

describe('TransferController', () => {
  let controller: TransferController;
  let transferService: TransferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [
        {
          provide: TransferService,
          useValue: {
            executeTransfer: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TransferController>(TransferController);
    transferService = module.get<TransferService>(TransferService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeTransfer', () => {
    it('should successfully execute a transfer with idempotency key', async () => {
      const idempotencyKey = 'uuid-1234-5678-90ab';
      const request: TransferRequestDto = {
        sourceAccountId: 'acc-001-nzd',
        destinationAccountId: 'acc-002-nzd',
        amount: 500,
        currency: 'NZD',
        description: 'Test transfer',
      };

      const expectedTxRef = 'TX-A1B2C3D4';
      jest.spyOn(transferService, 'executeTransfer').mockResolvedValue(expectedTxRef);

      const result = await controller.executeTransfer(idempotencyKey, request);

      expect(result.status).toBe('SUCCESS');
      expect(result.transactionReference).toBe(expectedTxRef);
      expect(result.idempotencyKey).toBe(idempotencyKey);
      expect(transferService.executeTransfer).toHaveBeenCalledWith(
        idempotencyKey,
        request.sourceAccountId,
        request.destinationAccountId,
        request.amount.toString(),
        request.currency,
        request.description,
      );
    });

    it('should execute transfer without idempotency key', async () => {
      const request: TransferRequestDto = {
        sourceAccountId: 'acc-001-nzd',
        destinationAccountId: 'acc-002-nzd',
        amount: 250.5,
        currency: 'NZD',
        description: 'Payment',
      };

      const expectedTxRef = 'TX-X9Y8Z7W6';
      jest.spyOn(transferService, 'executeTransfer').mockResolvedValue(expectedTxRef);

      const result = await controller.executeTransfer(undefined, request);

      expect(result.status).toBe('SUCCESS');
      expect(result.transactionReference).toBe(expectedTxRef);
      expect(result.idempotencyKey).toBe('NONE');
      expect(transferService.executeTransfer).toHaveBeenCalledWith(
        undefined,
        request.sourceAccountId,
        request.destinationAccountId,
        request.amount.toString(),
        request.currency,
        request.description,
      );
    });

    it('should return CREATED status code', async () => {
      const request: TransferRequestDto = {
        sourceAccountId: 'acc-001-nzd',
        destinationAccountId: 'acc-002-nzd',
        amount: 100,
        currency: 'NZD',
      };

      jest.spyOn(transferService, 'executeTransfer').mockResolvedValue('TX-TEST1234');

      const result = await controller.executeTransfer('key-123', request);

      expect(result).toBeDefined();
      expect(result.status).toBe('SUCCESS');
    });

    it('should propagate bad request exceptions from service', async () => {
      const request: TransferRequestDto = {
        sourceAccountId: 'acc-001-nzd',
        destinationAccountId: 'acc-002-nzd',
        amount: 5000,
        currency: 'NZD',
      };

      jest
        .spyOn(transferService, 'executeTransfer')
        .mockRejectedValue(new BadRequestException('Insufficient funds in source account'));

      await expect(controller.executeTransfer('key-123', request)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle missing optional description field', async () => {
      const request: TransferRequestDto = {
        sourceAccountId: 'acc-001-nzd',
        destinationAccountId: 'acc-002-nzd',
        amount: 100,
        currency: 'NZD',
      };

      jest.spyOn(transferService, 'executeTransfer').mockResolvedValue('TX-TEST1234');

      const result = await controller.executeTransfer('key-abc', request);

      expect(transferService.executeTransfer).toHaveBeenCalledWith(
        'key-abc',
        request.sourceAccountId,
        request.destinationAccountId,
        '100',
        request.currency,
        '',
      );
      expect(result.transactionReference).toBe('TX-TEST1234');
    });
  });
});
