# LedgerStream (Ledger/Accounts, FinTech) Pet Project
This pet project is to demonstrate the skills of AI-assisted technical design and implementation using:
- TypeScript, NestJS, TypeORM
- MySQL
- AWS - ECS/Fargate, ALB, RDS, S3, Lambda, SQS, serverless architecture
- Terraform
- Git/GitHub

# Technical Design Document: LedgerStream (Ledger/Accounts, FinTech)

## 1. System Overview & Architecture

LedgerStream is a core financial ledger and transaction processing service designed for high reliability, strict ACID compliance, and secure cloud-native deployment on **AWS ECS with Fargate**, backed by **Amazon RDS MySQL**, **AWS S3**, and **AWS SQS/Lambda**.

```mermaid
graph TD
    Client["Client / API Consumer"] -->|HTTP POST /transfers| ALB["AWS Application Load Balancer"]
    ALB -->|Forward Request| Fargate["AWS ECS Task on Fargate (NestJS)"]

    subgraph "State & Storage"
        Fargate -->|ACID Transaction / Pessimistic Lock| RDS["AWS RDS MySQL: Accounts & Ledger"]
        Fargate -->|Upload / Presigned URLs| S3["AWS S3 Bucket: Statements & Audits"]
    end

    Fargate -->|Send Event| SQS["AWS SQS Queue"]
    SQS -->|Trigger| Lambda["AWS Lambda: NestJS Settlement Processor"]
    Lambda -->|Update Status| RDS
```

## 2. Core Transaction Flow
The sequence diagram below illustrates how client requests are processed through double-entry database constraints with pessimistic locking, and emitted asynchronously for settlement.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant App as Backend API (NestJS)
    participant DB as MySQL (RDS)
    participant S3 as AWS S3
    participant SQS as AWS SQS
    participant Lambda as AWS Lambda (NestJS)

    Note over Client, DB: Step 1: Execute Double-Entry Transaction
    Client->>App: POST /api/v1/transfers (Idempotency-Key, Payload)
    App->>DB: Check Idempotency Key & Account Statuses
    App->>DB: BEGIN TRANSACTION (Pessimistic Lock on Accounts)
    App->>DB: Create Double-Entry Ledger Records (Debit & Credit)
    App->>DB: Update Account Balances
    App->>DB: COMMIT TRANSACTION
    App-->>Client: 201 Created (Transfer Details)

    Note over App, Lambda: Step 2: Asynchronous Settlement & Reconciliation
    App->>SQS: Send TransactionSettledEvent
    SQS->>Lambda: Trigger Settlement Processor
    Lambda->>DB: Update Settlement / Reconciliation Log Status

    Note over Client, S3: Step 3: Secure Statement / Audit Artifact Retrieval
    Client->>App: GET /api/v1/accounts/{id}/statement/url
    App->>S3: Generate Pre-signed URL (Expiry: 15 mins)
    App-->>Client: 200 OK (Pre-signed S3 URL)
```

## 3. Database Schema & Mock Data (SQL Migrations)

### 3.1 Initial Schema

```sql
CREATE TABLE accounts (
    id VARCHAR(36) PRIMARY KEY,
    account_number VARCHAR(34) NOT NULL UNIQUE,
    holder_name VARCHAR(100) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NZD',
    balance DECIMAL(19, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE ledger_entries (
    id VARCHAR(36) PRIMARY KEY,
    transaction_reference VARCHAR(50) NOT NULL,
    account_id VARCHAR(36) NOT NULL,
    entry_type VARCHAR(6) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NZD',
    description VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ledger_account FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE idempotency_keys (
    idempotency_key VARCHAR(100) PRIMARY KEY,
    request_hash VARCHAR(64) NOT NULL,
    response_body TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_ledger_tx_ref ON ledger_entries(transaction_reference);
CREATE INDEX idx_ledger_account_id ON ledger_entries(account_id);
```

### 3.2 Sample Mock Data

```sql
INSERT INTO accounts (id, account_number, holder_name, currency, balance, status, created_at, updated_at) VALUES
('acc-001-nzd', 'NZ01-8839-0012938-00', 'Kelvin Smith', 'NZD', 15000.0000, 'ACTIVE', NOW(), NOW()),
('acc-002-nzd', 'NZ01-8839-0098412-00', 'Treasury Ops', 'NZD', 500000.0000, 'ACTIVE', NOW(), NOW()),
('acc-003-nzd', 'NZ01-8839-0044123-00', 'Jane Doe', 'NZD', 250.5000, 'ACTIVE', NOW(), NOW());

INSERT INTO ledger_entries (id, transaction_reference, account_id, entry_type, amount, currency, description, created_at) VALUES
('tx-init-001', 'TX-INIT-20261018-01', 'acc-002-nzd', 'DEBIT', 15000.0000, 'NZD', 'Initial funding for Kelvin Smith', NOW()),
('tx-init-002', 'TX-INIT-20261018-01', 'acc-001-nzd', 'CREDIT', 15000.0000, 'NZD', 'Initial account balance creation', NOW());
```

## 4. Application Implementation Details

### 4.1 Core Transfer Service (TransferService.ts)

```typescript
```

### 4.2 Unit Test (TransferControllerTest.ts)

```typescript
```

## 5. Deployment & Operational Runbook

- Build Container: Package the NestJS application into a multi-stage Docker image and push to AWS ECR.

- Database Migration: Database migrations run automatically on deployment against RDS MySQL.

- AWS Fargate Deployment: Deploy ECS Task Definition behind an Application Load Balancer (ALB) with secure private VPC subnets.

- Testing: Issue HTTP POST requests to the ALB endpoint with appropriate Idempotency-Key headers.

# Development

## File structure

```text
ledger-aws-typescript/
├── .github/workflows/          # CI/CD pipeline (GitHub Actions for builds, tests)
├── apps/
│   ├── ledger-js/              # NestJS (TypeScript) Backend Component (TypeORM / MySQL)
│   │   ├── src/                # NestJS Source Code (Controllers, Services, Entities)
│   │   ├── test/               # Jest Unit & Integration Tests
│   │   ├── .env                # Local environment variables (Database, AWS config)
│   │   ├── package.json        # Node dependencies & npm scripts
│   │   ├── tsconfig.json       # TypeScript configuration
│   │   └── Dockerfile          # Multi-stage Docker build for NestJS on Fargate
│   │
│   └── lambda/                 # AWS Lambda Functions
│       └── settlement-handler/ # Asynchronous Settlement Processor (TypeScript/ NestJS)
│           ├── src/            # NestJS Lambda entrypoint & handlers
│           ├── package.json    # Node dependencies
│           └── tsconfig.json   # TypeScript configuration
│
├── terraform/                  # Infrastructure as Code (AWS ECS Fargate, RDS, ALB, S3, SQS, Lambda)
│   ├── variables.tf            # Environment parameters
│   ├── provider.tf             # AWS provider setup
│   ├── vpc.tf                  # Networking & Subnets
│   ├── alb.tf                  # Application Load Balancer
│   ├── ecs.tf                  # ECS Cluster & Fargate Task Definition
│   ├── rds.tf                  # Amazon RDS MySQL instance
│   ├── s3.tf                   # S3 Bucket for audit statements
│   ├── lambda.tf               # Lambda resource setup
│   └── sqs.tf                  # SQS Queue setup
├── docker-compose.yml          # Local development stack (MySQL + NestJS)
└── README.md                   # Comprehensive architecture & setup guide
```

## Infrastructure as Code

### AWS Commands
```bash
aws login
aws sts get-caller-identity
aws configure

aws lambda list-functions --region ap-southeast-2
aws lambda get-function --function-name ledger-stream-settlement-handler-dev --region ap-southeast-2
aws logs tail /aws/lambda/ledger-stream-settlement-handler-dev --follow --region ap-southeast-2
```

### Terraform Commands
```bash
cd terraform

# NEW AWS EXPERIENCE: Load credentials from cache before running terraform
source ./setup-aws-credentials.sh

# Initialize any providers or modules (good habit)
terraform init

# DEV environment — plan and apply
terraform plan -var-file="terraform-dev.tfvars"
# Apply changes interactively (you'll be prompted with a summary, type 'yes' to confirm)
terraform apply -var-file="terraform-dev.tfvars"
# terraform apply -var-file="terraform-dev.tfvars" -auto-approve

# PROD environment — plan and apply
terraform plan -var-file="terraform-prod.tfvars"
terraform apply -var-file="terraform-prod.tfvars"

# Destroy resources (cleanup)
terraform destroy -var-file="terraform-dev.tfvars"
```

### Build the Docker Image Locally and push to AWS ECR
```bash
# Create the ECR repository
terraform apply -var-file="terraform-dev.tfvars" -target=aws_ecr_repository.ledger_stream

# Authenticate your local Docker client to your AWS ECR registry
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.<region>.amazonaws.com

# Build your Docker image from your PHP project directory
cd apps/ledger-js
docker build -t ledger-stream-js .

# Tag your local image so Docker knows which ECR repository and tag it
docker tag ledger-stream-js:latest <aws-account-id>.dkr.ecr.<region>.amazonaws.com/ledger-stream-js:latest

# Push the tagged image up to your ECR repository
docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/ledger-stream-js:latest

aws ecs update-service --cluster ledger-stream-cluster-dev --service ledger-stream-service-dev --force-new-deployment --region ap-southeast-2

aws logs tail /ecs/ledger-stream-dev --follow --region ap-southeast-2
```

#### Test Docker Image Locally
```bash
docker run --rm \
  -p 8080:8080 \
  -e DATABASE_URL="mysql://root:rootpassword@172.17.0.1:3306/ledger_db?serverVersion=8.0&charset=utf8mb4" \
  -e SQS_SETTLEMENT_QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/<aws-account-id>/ledger-settlement-queue-dev \
  -e AWS_REGION=ap-southeast-2 \
  -e AWS_S3_AUDIT_BUCKET_NAME=ledger-audit-statements-dev \
  ledger-stream-js:latest
```

## TypeScript, NestJS, Node.js Development

### Quick Start: Ledger Microservice (`apps/ledger-js`)

```bash
cd apps/ledger-js

# 1. Install dependencies
npm install

# 2. Run NestJS application locally
npm run start:dev

# 3. Run unit tests
npm run test
```

#### Background: How Microservice project was setup from scratch
```bash
# 1. Create and navigate into the app directory
mkdir -p apps/ledger-js
cd apps/ledger-js

# 2. Initialize Node.js project
npm init -y

# 3. Install Core NestJS Dependencies & HTTP Platform
npm install @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs

# 4. Install TypeORM & MySQL Driver Packages
npm install typeorm @nestjs/typeorm mysql2

# 5. Install Development Dependencies (TypeScript, CLI, types)
npm install --save-dev typescript @types/node @nestjs/cli @types/express ts-node
```

### Quick Start: Build & Package Lambda Functions (`apps/lambda/settlement-handler`)

```bash
cd apps/lambda/settlement-handler

# 1. Install dependencies
npm install

# 2. Build NestJS Lambda handler
npm run build

# 3. Build function.zip file for AWS Lambda deployment
./build.sh
```

#### Background: How Lambda project was setup from scratch
```bash
mkdir -p apps/lambda/settlement-handler
cd apps/lambda/settlement-handler
# Initialize a new Node.js project (if package.json doesn't exist yet)
npm init -y
# Production Dependencies (NestJS core & reflection)
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
# Development Dependencies (TypeScript, AWS types, and bundler)
npm install --save-dev typescript @types/node @types/aws-lambda esbuild @nestjs/cli
```

# Testing

## Test API with curl

### 1. Start the Application
```bash
# at root folder
docker compose up --build

curl -X GET "http://localhost:8080/health"
```

The API will be available at `http://localhost:8080/api`.

### 2. Get Account Statement URL Request
```bash
curl -X GET "http://localhost:8080/api/v1/accounts/acc-001-nzd/statement/url" \
     -H "Accept: application/json"
```

### 3. Execute a Transfer Request
```bash
curl -X POST http://localhost:8080/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "sourceAccountId": "acc-001-nzd",
    "destinationAccountId": "acc-002-nzd",
    "amount": 250.00,
    "currency": "NZD",
    "description": "Peer-to-peer payment"
  }'
```

**Expected Response (201 Created):**
```json
{
  "status": "SUCCESS",
  "transactionReference": "TX-A1B2C3D4",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 4. Verify Idempotency — Resubmit with Same Key
```bash
curl -X POST http://localhost:8080/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "sourceAccountId": "acc-001-nzd",
    "destinationAccountId": "acc-002-nzd",
    "amount": 250.00,
    "currency": "NZD",
    "description": "Peer-to-peer payment"
  }'
```
Should return the **same transaction reference** and HTTP 201 without creating duplicate entries.

### 5. Test Insufficient Funds Scenario
```bash
curl -X POST http://localhost:8080/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "sourceAccountId": "acc-003-nzd",
    "destinationAccountId": "acc-002-nzd",
    "amount": 10000.00,
    "currency": "NZD",
    "description": "Large transfer"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "timestamp": "2026-10-22T10:48:50+13:00",
  "message": "Insufficient funds in source account",
  "error": "Bad Request",
  "status": 400
}
```