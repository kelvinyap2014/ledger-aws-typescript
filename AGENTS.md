# Agent Guidance: LedgerStream (Ledger/Accounts, FinTech) Pet Project — TypeScript/NestJS

## Project Overview

**LedgerStream** is a core financial ledger and transaction processing service designed for high reliability, strict ACID compliance, and secure cloud-native deployment on **AWS ECS with Fargate**, backed by **Amazon RDS MySQL**, **AWS S3**, and **AWS SQS/Lambda**.

This pet project demonstrates AI-assisted technical design and implementation using:
- **Backend:** TypeScript, NestJS 10, TypeORM
- **Database:** Amazon RDS MySQL 8.0
- **Serverless:** AWS ECS/Fargate, AWS Lambda (Node.js/NestJS)
- **Messaging:** AWS SQS
- **Storage:** AWS S3 (audit statements & presigned URLs)
- **Infrastructure:** Terraform, Application Load Balancer (ALB)
- **Version Control:** Git/GitHub

---

## Project Structure

```
ledger-aws-typescript/
├── .github/workflows/              # CI/CD pipeline (GitHub Actions)
├── apps/
│   ├── ledger-js/                  # NestJS (TypeScript) Backend
│   │   ├── src/                    # NestJS Controllers, Services, Entities
│   │   ├── test/                   # Jest Unit & Integration Tests
│   │   ├── .env                    # Environment variables (local)
│   │   ├── package.json            # Node dependencies
│   │   ├── tsconfig.json           # TypeScript configuration
│   │   └── Dockerfile              # Multi-stage Docker build
│   │
│   └── lambda/                     # AWS Lambda Functions
│       └── settlement-handler/     # Settlement Processor (NestJS)
│           ├── src/                # NestJS Lambda entrypoint
│           ├── package.json        # Node dependencies
│           └── tsconfig.json       # TypeScript configuration
│
├── terraform/                      # Infrastructure as Code
│   ├── variables.tf                # Common variables
│   ├── provider.tf                 # AWS provider setup
│   ├── alb.tf                      # Application Load Balancer
│   ├── ecs.tf                      # ECS Cluster & Fargate Task
│   ├── rds.tf                      # Amazon RDS MySQL
│   ├── s3.tf                       # S3 Bucket
│   ├── lambda.tf                   # Lambda functions
│   ├── sqs.tf                      # SQS Queue
│   ├── iam.tf                      # IAM roles & policies
│   ├── setup-aws-credentials.sh    # AWS credential loader
│   ├── terraform-dev.tfvars        # Development environment
│   └── terraform-prod.tfvars       # Production environment
│
├── docker-compose.yml              # Local development stack
└── README.md                       # Comprehensive architecture guide
```

---

## Architecture Overview

```
Client → ALB → ECS Task (NestJS/Fargate) → RDS MySQL
                                       ↓
                                  AWS S3 (statements)
                                       ↓
                                  AWS SQS (events)
                                       ↓
                               AWS Lambda (NestJS settlement)
```

### Core Features
1. **Double-Entry Ledger** — All transactions recorded as debit/credit pairs (ACID)
2. **Pessimistic Locking** — Account-level locks prevent race conditions
3. **Idempotency** — Request deduplication via idempotency keys
4. **Asynchronous Settlement** — Events published to SQS, processed by Lambda
5. **Statement Export** — Pre-signed S3 URLs for secure document retrieval

---

## Build & Development Commands

### TypeScript / NestJS (Backend)

**Quick Reference:**
```bash
cd apps/ledger-js

# Install dependencies
npm install

# Run development server (watch mode)
npm run start:dev

# Run application in production mode
npm run start:prod

# Build TypeScript to JavaScript
npm run build

# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov
```

**Requirements:**
- Node.js 18+ installed
- npm 9+ installed
- TypeScript 5+

### TypeScript / Lambda Settlement Handler

**Quick Reference:**
```bash
cd apps/lambda/settlement-handler

# Install dependencies
npm install

# Build NestJS Lambda handler
npm run build

# Package as function.zip for AWS Lambda
./build.sh

# Or use npm script
npm run package
```

**Requirements:**
- Node.js 18+ installed
- npm 9+ installed
- TypeScript 5+
- esbuild bundler

### Docker Compose (Local Development)

```bash
# At project root
docker compose up --build

# Run migrations inside container
docker exec -it ledger_js npm run migration:run

# Restart MySQL cleanly (fresh volume)
docker compose down -v
docker compose up --build

# Stop all services
docker compose down
```

**Access:**
- API Base URL: `http://localhost:8081/api`
- Health Check: `GET http://localhost:8081/health`

---

## AWS Infrastructure (Terraform)

All Terraform code is in the `terraform/` directory. Key commands:

### Terraform Workflow (New AWS Experience)

> **CRITICAL:** The new AWS experience uses a credential cache. Before running Terraform,
> load credentials from the cache using the provided setup script.

```bash
cd terraform

# 1. Load AWS credentials from new AWS experience cache
source ./setup-aws-credentials.sh

# 2. Initialize Terraform (first time or after provider upgrades)
terraform init

# 3. Plan changes (always review before apply)
terraform plan -var-file="terraform-dev.tfvars"

# 4. Apply changes (DEV environment)
terraform apply -var-file="terraform-dev.tfvars"

# 5. For PROD (replace terraform-dev.tfvars with terraform-prod.tfvars)
terraform plan -var-file="terraform-prod.tfvars"
terraform apply -var-file="terraform-prod.tfvars"

# 6. Destroy all resources (cleanup / cost control)
terraform destroy -var-file="terraform-dev.tfvars"
```

### AWS Region Constraint

All Regional resources **MUST** be created in **ap-southeast-2** (your assigned region via AWS Settings).
- Lambda, ECS, ALB, RDS, SQS — all in ap-southeast-2
- Do NOT attempt to create these in other Regions
- Confirm your assigned Region in AWS Settings > View all projects > Overview > Additional Info > Region

### Common Terraform Commands

```bash
# Create only the ECR repository
terraform apply -var-file="terraform-dev.tfvars" -target=aws_ecr_repository.ledger_stream

# Create only the RDS database
terraform apply -var-file="terraform-dev.tfvars" -target=aws_db_instance.ledger_mysql

# Refresh state
terraform refresh -var-file="terraform-dev.tfvars"

# Show current state
terraform show

# Validate configuration
terraform validate
```

---

## Docker & ECR Workflow

### Build & Push to AWS ECR

```bash
# 1. Create ECR repository via Terraform
cd terraform
source ./setup-aws-credentials.sh
terraform apply -var-file="terraform-dev.tfvars" -target=aws_ecr_repository.ledger_stream

# 2. Authenticate Docker client to ECR
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com

# 3. Build Docker image (from project root)
cd ..
docker build -f apps/ledger-js/Dockerfile -t ledger-stream-js:latest apps/ledger-js

# 4. Tag for ECR
docker tag ledger-stream-js:latest \
  <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/ledger-stream-js:latest

# 5. Push to ECR
docker push <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/ledger-stream-js:latest

# 6. Force new ECS deployment
aws ecs update-service \
  --cluster ledger-stream-cluster-dev \
  --service ledger-stream-service-dev \
  --force-new-deployment \
  --region ap-southeast-2

# 7. Monitor ECS logs
aws logs tail /ecs/ledger-stream-dev --follow --region ap-southeast-2
```

### Test Docker Image Locally

```bash
docker run --rm \
  -p 8080:8080 \
  -e PORT=8080 \
  -e DB_HOST=172.17.0.1 \
  -e DB_PORT=3306 \
  -e DB_USER=root \
  -e DB_PASSWORD=rootpassword \
  -e DB_NAME=ledger_db \
  -e SQS_SETTLEMENT_QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/<aws-account-id>/ledger-settlement-queue-dev \
  -e AWS_REGION=ap-southeast-2 \
  -e AWS_S3_AUDIT_BUCKET_NAME=ledger-audit-statements-dev \
  ledger-stream-js:latest
```

---

## AWS CLI Commands

```bash
# View Lambda function status
aws lambda list-functions --region ap-southeast-2
aws lambda get-function --function-name ledger-stream-settlement-handler-dev --region ap-southeast-2

# Monitor Lambda logs
aws logs tail /aws/lambda/ledger-stream-settlement-handler-dev --follow --region ap-southeast-2

# Check RDS instance status
aws rds describe-db-instances --region ap-southeast-2

# Get ALB DNS endpoint
aws elbv2 describe-load-balancers --region ap-southeast-2 | jq '.LoadBalancers[0].DNSName'

# List SQS queues
aws sqs list-queues --region ap-southeast-2

# Monitor SQS queue depth
aws sqs get-queue-attributes \
  --queue-url https://sqs.ap-southeast-2.amazonaws.com/<account-id>/ledger-settlement-queue-dev \
  --attribute-names ApproximateNumberOfMessages
```

---

## Development Workflow (Typical Sprint)

1. **Feature Branch** — Create feature branch in Git
   ```bash
   git checkout -b feature/xyz
   ```

2. **Local Development**:
   ```bash
   cd apps/ledger-js
   npm install
   npm run start:dev
   ```

3. **Write Tests** — Add unit tests in `test/` folder
   ```bash
   npm run test
   ```

4. **Docker Validation** — Test containerization
   ```bash
   docker compose up --build
   docker exec -it ledger_js npm run test
   ```

5. **Infrastructure Changes** (if any):
   ```bash
   cd terraform
   terraform plan -var-file="terraform-dev.tfvars"
   ```

6. **Build & Push to ECR** (when ready for deployment):
   ```bash
   docker build -f apps/ledger-js/Dockerfile -t ledger-stream-js:latest apps/ledger-js
   docker tag ledger-stream-js:latest \
     <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/ledger-stream-js:latest
   docker push <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/ledger-stream-js:latest
   ```

7. **Commit & Push** — Push feature branch to GitHub
   ```bash
   git add .
   git commit -m "feat: add xyz"
   git push origin feature/xyz
   ```

8. **Code Review** — Create pull request, wait for approval

9. **Deploy** — Merge to main, run Terraform apply on production
   ```bash
   cd terraform
   terraform apply -var-file="terraform-prod.tfvars"
   ```

---

## Testing

### Manual API Testing (curl)

**Start the application:**
```bash
docker compose up --build
```

**Health check:**
```bash
curl -X GET "http://localhost:8081/health"
```

**Get account statement URL:**
```bash
curl -X GET "http://localhost:8081/api/v1/accounts/acc-001-nzd/statement/url" \
     -H "Accept: application/json"
```

**Execute a transfer:**
```bash
curl -X POST http://localhost:8081/api/v1/transfers \
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

**Expected response (201 Created):**
```json
{
  "status": "SUCCESS",
  "transactionReference": "TX-A1B2C3D4",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Unit & Integration Tests

```bash
cd apps/ledger-js

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:cov
```

---

## Available Skills

Load a skill with the Read tool for detailed step-by-step guidance:

| Skill | When to Use |
|---|---|
| `typescript-builds` (.agents/skills/typescript-builds/SKILL.md) | TypeScript/NestJS build, test, Docker workflow, Terraform deployment |

---

## Key Environment Files

| File | Purpose |
|---|---|
| `apps/ledger-js/package.json` | Node.js dependencies, npm scripts |
| `apps/ledger-js/tsconfig.json` | TypeScript configuration |
| `apps/ledger-js/.env` | Environment variables (local override) |
| `apps/ledger-js/Dockerfile` | Multi-stage Docker build for Fargate |
| `apps/lambda/settlement-handler/package.json` | Lambda dependencies |
| `terraform/variables.tf` | Common Terraform variables |
| `terraform/terraform-dev.tfvars` | Development environment overrides |
| `docker-compose.yml` | Local MySQL + NestJS stack definition |
| `.github/workflows/` | CI/CD pipeline (build, test, deploy) |

---

## Stop & Consult User If

- Build or compilation fails with unclear error messages (attempt 5+ debug cycles, then consult)
- Terraform plan shows unexpected resource changes or destruction
- AWS credentials expire or are missing (re-run `source ./setup-aws-credentials.sh`)
- Need to modify assigned Region or deploy to production with manual approval
- Performance regression > 30% below baseline latency targets
- Unable to achieve 0 errors/warnings in TypeScript compilation (`npm run build`)
- Database migration failures or schema incompatibility issues

---

## New AWS Experience Constraints

- **Region Constraint:** All resources MUST be deployed to **ap-southeast-2**
- **Credential Cache:** Always run `source ./setup-aws-credentials.sh` before Terraform commands
- **Service Availability:** Confirm service availability in ap-southeast-2 before attempting deployment
- **Spend Limit:** If you have a spend limit and resources become inaccessible, check AWS Settings > Billing
- **Supported Services:** Check AWS free tier / paid tier service lists if a service is unavailable
- **Cost Management:** Always review `terraform plan` before applying; use `terraform destroy` to clean up unused resources

---

## Helpful Commands Quick Reference

```bash
# TypeScript / NestJS
cd apps/ledger-js && npm install
npm run start:dev
npm run build
npm run test
npm run test:cov

# Docker / Docker Compose
docker compose up --build
docker compose down -v
docker compose restart

# Terraform (with credential setup)
cd terraform && source ./setup-aws-credentials.sh
terraform init
terraform plan -var-file="terraform-dev.tfvars"
terraform apply -var-file="terraform-dev.tfvars"
terraform destroy -var-file="terraform-dev.tfvars"

# ECR & Docker
docker build -f apps/ledger-js/Dockerfile -t ledger-stream-js:latest apps/ledger-js
docker tag ledger-stream-js:latest <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/ledger-stream-js:latest
docker push <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/ledger-stream-js:latest

# AWS CLI
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com
aws logs tail /ecs/ledger-stream-dev --follow --region ap-southeast-2
aws logs tail /aws/lambda/ledger-stream-settlement-handler-dev --follow --region ap-southeast-2

# Git
git checkout -b feature/xyz
git commit -m "message"
git push origin feature/xyz
```

---

## References

- **README.md** — Full architecture & system design documentation
- **apps/ledger-js/Dockerfile** — Multi-stage Docker build for NestJS
- **terraform/*** — Infrastructure definition files
- **docker-compose.yml** — Local development environment
