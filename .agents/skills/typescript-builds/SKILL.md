# SKILL: TypeScript/NestJS Build & Deployment Workflow

## Overview

This skill provides step-by-step guidance for building, testing, and deploying the LedgerStream TypeScript/NestJS backend application and Lambda functions. This includes local development, Docker containerization, testing procedures, and AWS infrastructure deployment via Terraform.

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Building & Compiling TypeScript](#building--compiling-typescript)
3. [Running Tests](#running-tests)
4. [Docker Development Environment](#docker-development-environment)
5. [Building Docker Images](#building-docker-images)
6. [Terraform Deployment](#terraform-deployment)
7. [AWS ECR & ECS Integration](#aws-ecr--ecs-integration)
8. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Step 1: Install Node.js & npm

**Verify installation:**
```bash
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher
```

If Node.js is not installed, install from https://nodejs.org/ (LTS version recommended).

### Step 2: Navigate to Backend Directory

```bash
cd /home/user/git/temp/hobby/ledger-aws-typescript/apps/ledger-js
```

### Step 3: Install Dependencies

```bash
npm install
```

**Expected output:**
- Installs all packages listed in `package.json`
- Creates `node_modules/` directory
- Generates `package-lock.json` (if updated)

### Step 4: Verify Installation

```bash
npm list @nestjs/core
```

Should show NestJS core package installed successfully.

---

## Building & Compiling TypeScript

### Step 1: Clean Build

```bash
npm run build
```

**What this does:**
- Compiles all TypeScript `.ts` files to JavaScript `.js`
- Output stored in `dist/` directory
- Type checking ensures no TypeScript errors

**Expected output:**
```
> ledger-js@1.0.0 build
> nest build

✔ Compilation successful
```

**On errors:**
- Read the TypeScript error messages carefully
- Common issues: type mismatches, missing imports, syntax errors
- Fix the reported line numbers in source files
- Re-run `npm run build`

### Step 2: Verify Output

```bash
ls -la dist/
```

Should see JavaScript files matching your TypeScript source structure:
```
dist/
├── main.js
├── app.controller.js
├── app.service.js
├── entity/
├── controller/
└── service/
```

### Step 3: Check for Type Errors (Without Building)

```bash
npx tsc --noEmit
```

This runs TypeScript compiler without generating output — useful for quick type checking during development.

---

## Running Tests

### Step 1: Run All Tests

```bash
npm run test
```

**What this does:**
- Runs Jest test runner
- Executes all `.spec.ts` files in `test/` directory
- Displays pass/fail results

**Expected output:**
```
PASS  test/app.controller.spec.ts
  AppController
    health
      ✓ should return health status UP with timestamp (5ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

### Step 2: Run Tests in Watch Mode

```bash
npm run test:watch
```

- Re-runs tests automatically when files change
- Useful during development for immediate feedback
- Press `q` to quit watch mode

### Step 3: Run Tests with Coverage Report

```bash
npm run test:cov
```

**What this does:**
- Runs all tests
- Generates coverage report showing % of code covered by tests
- Output stored in `coverage/` directory

**Expected output:**
```
---------|----------|----------|----------|----------|-------------------|
File     | % Stmts  | % Branch | % Funcs  | % Lines  | Uncovered Line #s |
---------|----------|----------|----------|----------|-------------------|
All files|    90    |    85    |    95    |    90    |                   |
---------|----------|----------|----------|----------|-------------------|
```

### Step 4: Verify Test Results

- **PASS:** All tests ran successfully
- **FAIL:** Some tests failed — read error messages, fix code, re-run
- **Coverage < 80%:** Consider adding more tests for untested code paths

---

## Docker Development Environment

### Step 1: Navigate to Project Root

```bash
cd /home/user/git/temp/hobby/ledger-aws-typescript
```

Verify `docker-compose.yml` exists:
```bash
ls -la docker-compose.yml
```

### Step 2: Start Docker Compose (Full Stack)

```bash
docker compose up --build
```

**What this does:**
- Builds Docker images for MySQL and NestJS
- Starts MySQL 8.0 database container
- Starts NestJS application container
- Initializes database schema via migrations
- Exposes API on `http://localhost:8081`

**Expected output:**
```
ledger_js     | [Nest] 1 - 10/25/2026, 2:30:15 PM [NestFactory] ✓ Application lancée en 1234ms
ledger_js     | [Nest] 1 - 10/25/2026, 2:30:15 PM [InstanceLoader] Dependencies resolved
ledger_js     | Listening on port 8081
```

### Step 3: Verify Running Containers

In a new terminal:
```bash
docker compose ps
```

**Expected output:**
```
NAME                SERVICE      STATUS      PORTS
ledger-mysql-js     mysql-js     Up          0.0.0.0:3306->3306/tcp
ledger_js           ledger-js    Up          0.0.0.0:8081->8081/tcp
```

### Step 4: Test API Health Endpoint

```bash
curl http://localhost:8081/health
```

**Expected response (200 OK):**
```json
{
  "status": "UP",
  "timestamp": "2026-10-25T02:30:20Z"
}
```

### Step 5: Stop All Services

```bash
docker compose down
```

To also remove volumes (fresh database on next startup):
```bash
docker compose down -v
```

### Step 6: View Container Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f ledger_js
docker compose logs -f mysql-js
```

---

## Building Docker Images

### Step 1: Build NestJS Application Image

From project root:
```bash
docker build -f apps/ledger-js/Dockerfile -t ledger-stream-js:latest apps/ledger-js
```

**What this does:**
- Reads multi-stage Dockerfile from `apps/ledger-js/`
- Builds TypeScript to JavaScript
- Creates lightweight production image
- Tags image as `ledger-stream-js:latest`

**Expected output:**
```
[+] Building 45.3s (15/15) FINISHED
 => [internal] load build definition from Dockerfile
 ...
 => => naming to docker.io/library/ledger-stream-js:latest
```

### Step 2: Verify Image Built

```bash
docker images | grep ledger-stream-js
```

**Expected output:**
```
ledger-stream-js    latest    a1b2c3d4e5f6    2 minutes ago    250MB
```

### Step 3: Test Image Locally

```bash
docker run --rm \
  -p 8080:8080 \
  -e PORT=8080 \
  -e DB_HOST=172.17.0.1 \
  -e DB_PORT=3306 \
  -e DB_USER=root \
  -e DB_PASSWORD=rootpassword \
  -e DB_NAME=ledger_db \
  ledger-stream-js:latest
```

**Expected output:**
```
[Nest] 1 - 10/25/2026, 2:35:00 PM [NestFactory] ✓ Application lancée en 1234ms
Listening on port 8080
```

Press `Ctrl+C` to stop the container.

### Step 4: Build Lambda Settlement Handler

Navigate to Lambda directory:
```bash
cd apps/lambda/settlement-handler
```

Install dependencies:
```bash
npm install
```

Build TypeScript:
```bash
npm run build
```

**Expected output:**
```
> settlement-handler@1.0.0 build
> nest build

✔ Compilation successful
```

### Step 5: Package Lambda as ZIP

```bash
./build.sh
```

**Or use npm script:**
```bash
npm run package
```

**Expected output:**
```
✓ Built dist/
✓ Created function.zip
✓ ZIP file ready for AWS Lambda deployment
```

Verify ZIP file exists:
```bash
ls -lh function.zip
```

---

## Terraform Deployment

### Step 1: Load AWS Credentials

Navigate to Terraform directory:
```bash
cd terraform
```

Source the credential loader script:
```bash
source ./setup-aws-credentials.sh
```

**What this does:**
- Extracts AWS credentials from new AWS experience cache
- Sets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` environment variables
- Valid for ~12 hours

**Verify credentials loaded:**
```bash
echo $AWS_ACCESS_KEY_ID
```

Should output a non-empty access key ID.

### Step 2: Initialize Terraform

```bash
terraform init
```

**What this does:**
- Initializes Terraform working directory
- Downloads AWS provider plugin
- Creates `.terraform/` directory

**Expected output:**
```
Terraform has been successfully configured!
```

On subsequent runs, you may see:
```
Terraform has already been initialized in this directory.
```

This is normal — only needed after provider upgrades.

### Step 3: Validate Configuration

```bash
terraform validate
```

**Expected output:**
```
Success! The configuration is valid.
```

On errors, read the error message and fix `*.tf` files accordingly.

### Step 4: Plan Deployment (DEV)

```bash
terraform plan -var-file="terraform-dev.tfvars"
```

**What this does:**
- Shows all resources that will be created/modified/destroyed
- Does NOT make any changes to AWS

**Expected output:**
- Lists resources like: `aws_db_instance.ledger_mysql`, `aws_ecs_cluster.ledger`, etc.
- Ends with: `Plan: XX to add, 0 to change, 0 to destroy.`

**Review carefully:**
- Ensure only expected resources are listed
- If unexpected deletions appear, STOP and consult user

### Step 5: Apply Deployment (DEV)

```bash
terraform apply -var-file="terraform-dev.tfvars"
```

**What this does:**
- Creates all AWS resources defined in `.tf` files
- Prompts for confirmation before applying changes

**When prompted:**
```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.
```

Type `yes` and press Enter to proceed.

**Expected output:**
```
aws_db_instance.ledger_mysql: Creating...
aws_ecs_cluster.ledger: Creating...
...
Apply complete! Resources: XX added, 0 changed, 0 destroyed.
```

**On errors:**
- Read error message (e.g., invalid IAM policy, region unavailable)
- Common: `InvalidParameterValue` — check `terraform-dev.tfvars`
- Fix configuration and re-run `terraform apply`

### Step 6: Verify Resources Created

```bash
terraform show
```

Shows all resources currently managed by Terraform.

Or check AWS console:
```bash
aws rds describe-db-instances --region ap-southeast-2
aws ecs list-clusters --region ap-southeast-2
```

### Step 7: Destroy Resources (Cleanup)

When done testing:
```bash
terraform destroy -var-file="terraform-dev.tfvars"
```

**When prompted:**
```
Do you really want to destroy all resources managed by Terraform in the backend?
  Terraform will destroy all your managed infrastructure.
  Type 'yes' to confirm.
```

Type `yes` to proceed.

**Expected output:**
```
Destroy complete! Resources: XX destroyed.
```

---

## AWS ECR & ECS Integration

### Step 1: Create ECR Repository via Terraform

```bash
cd terraform
source ./setup-aws-credentials.sh
terraform apply -var-file="terraform-dev.tfvars" -target=aws_ecr_repository.ledger_stream
```

**What this does:**
- Creates private ECR repository named `ledger-stream-js`
- Only this specific resource is created (not ALB, RDS, etc.)

**Expected output:**
```
aws_ecr_repository.ledger_stream: Creating...
aws_ecr_repository.ledger_stream: Creation complete after 2s
```

### Step 2: Authenticate Docker to ECR

Get login password:
```bash
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com
```

**Replace `<aws-account-id>` with your AWS account ID.**

Get your account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

**Expected output on login:**
```
Login Succeeded
```

### Step 3: Tag Docker Image for ECR

```bash
docker tag ledger-stream-js:latest \
  <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/ledger-stream-js:latest
```

Verify tag:
```bash
docker images | grep ledger-stream-js
```

### Step 4: Push Image to ECR

```bash
docker push <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/ledger-stream-js:latest
```

**Expected output:**
```
The push refers to repository [.../ledger-stream-js]
a1b2c3d4e5f6: Pushed
latest: digest: sha256:... size: ...
```

### Step 5: Verify Image in ECR

```bash
aws ecr describe-images --region ap-southeast-2 --repository-name ledger-stream-js
```

### Step 6: Force ECS Deployment with New Image

```bash
aws ecs update-service \
  --cluster ledger-stream-cluster-dev \
  --service ledger-stream-service-dev \
  --force-new-deployment \
  --region ap-southeast-2
```

**Expected output:**
```
{
  "service": {
    "serviceName": "ledger-stream-service-dev",
    "taskDefinition": "arn:aws:ecs:...",
    "desiredCount": 1,
    "runningCount": 0,
    ...
  }
}
```

### Step 7: Monitor ECS Deployment

```bash
aws ecs describe-services \
  --cluster ledger-stream-cluster-dev \
  --services ledger-stream-service-dev \
  --region ap-southeast-2
```

Check `deployments` section — new deployment should reach `runningCount: 1`.

### Step 8: View Application Logs

```bash
aws logs tail /ecs/ledger-stream-dev --follow --region ap-southeast-2
```

**Expected output:**
```
2026-10-25T02:40:00.123Z INFO [Nest] Application launched
2026-10-25T02:40:00.456Z INFO Server listening on port 8080
```

Press `Ctrl+C` to exit.

---

## Troubleshooting

### Issue: TypeScript Compilation Errors

**Problem:** `npm run build` fails with type errors

**Solution:**
1. Read the error message carefully — it shows file path and line number
2. Example error: `src/app.service.ts:15 - error TS2334: Parameter 'x' implicitly has an 'any' type.`
3. Fix the reported line (check type annotations, imports)
4. Re-run `npm run build`

### Issue: Docker Container Won't Start

**Problem:** `docker compose up` fails

**Solution:**
1. Check logs: `docker compose logs`
2. Common issues:
   - Port 8081 already in use: `lsof -i :8081` and kill the process
   - MySQL failed to start: `docker compose down -v` then `docker compose up --build`
   - Database connection error: Wait 10 seconds then retry (MySQL slow to start)

### Issue: Tests Fail

**Problem:** `npm run test` shows failing tests

**Solution:**
1. Read the test output — shows which test failed and why
2. Check the test file (e.g., `test/app.controller.spec.ts`)
3. Check the implementation being tested
4. Update code to make tests pass
5. Re-run `npm run test`

### Issue: Terraform Apply Fails

**Problem:** `terraform apply` returns error

**Typical errors:**
- `InvalidParameterValue` — check variable values in `.tfvars` file
- `User: arn:aws:iam::... is not authorized` — credentials expired, re-run `source ./setup-aws-credentials.sh`
- `ResourceXXAlreadyExists` — resource already created, destroy and re-apply

**Solution:**
1. Read error message for specific issue
2. Make corrections to `.tf` or `.tfvars` files
3. Re-run `terraform plan` to validate
4. Re-run `terraform apply`

### Issue: AWS Credentials Expired

**Problem:** `terraform apply` shows "not authorized" errors

**Solution:**
```bash
source ./setup-aws-credentials.sh
```

This reloads credentials from AWS experience cache. Repeat `terraform apply`.

### Issue: ECR Push Fails

**Problem:** `docker push` returns "denied" or "unauthorized"

**Solution:**
1. Re-authenticate to ECR:
   ```bash
   aws ecr get-login-password --region ap-southeast-2 | \
     docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com
   ```
2. Verify image is tagged correctly:
   ```bash
   docker images | grep ledger-stream-js
   ```
3. Retry push

---

## Summary Checklist

✓ Install Node.js 18+
✓ Run `npm install`
✓ Run `npm run build` (0 errors)
✓ Run `npm run test` (all pass)
✓ Run `docker compose up --build`
✓ Test API: `curl http://localhost:8081/health`
✓ Run `source ./setup-aws-credentials.sh`
✓ Run `terraform plan -var-file="terraform-dev.tfvars"`
✓ Run `terraform apply -var-file="terraform-dev.tfvars"`
✓ Build Docker image: `docker build -f apps/ledger-js/Dockerfile ...`
✓ Push to ECR: `docker push <account>.dkr.ecr.ap-southeast-2.amazonaws.com/...`
✓ Verify ECS deployment: `aws ecs describe-services ...`
