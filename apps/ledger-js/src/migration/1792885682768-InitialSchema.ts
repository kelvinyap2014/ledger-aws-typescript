import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792885682768 implements MigrationInterface {
    name = 'InitialSchema1792885682768'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`ledger_entries\` (\`id\` varchar(36) NOT NULL, \`transaction_reference\` varchar(50) NOT NULL, \`account_id\` varchar(36) NOT NULL, \`entry_type\` enum ('DEBIT', 'CREDIT') NOT NULL, \`amount\` decimal(19,4) NOT NULL, \`currency\` varchar(3) NOT NULL DEFAULT 'NZD', \`description\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`accounts\` (\`id\` varchar(36) NOT NULL, \`account_number\` varchar(34) NOT NULL, \`holder_name\` varchar(100) NOT NULL, \`currency\` varchar(3) NOT NULL DEFAULT 'NZD', \`balance\` decimal(19,4) NOT NULL DEFAULT '0.0000', \`status\` varchar(20) NOT NULL DEFAULT 'ACTIVE', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_ffd1ae96513bfb2c6eada0f7d3\` (\`account_number\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`idempotency_keys\` (\`idempotency_key\` varchar(100) NOT NULL, \`request_hash\` varchar(64) NOT NULL, \`response_body\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`idempotency_key\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`ledger_entries\` ADD CONSTRAINT \`FK_e4440167e470be69f9622c1ceab\` FOREIGN KEY (\`account_id\`) REFERENCES \`accounts\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`ledger_entries\` DROP FOREIGN KEY \`FK_e4440167e470be69f9622c1ceab\``);
        await queryRunner.query(`DROP TABLE \`idempotency_keys\``);
        await queryRunner.query(`DROP INDEX \`IDX_ffd1ae96513bfb2c6eada0f7d3\` ON \`accounts\``);
        await queryRunner.query(`DROP TABLE \`accounts\``);
        await queryRunner.query(`DROP TABLE \`ledger_entries\``);
    }

}
