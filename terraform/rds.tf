# 1. Database Subnet Group
resource "aws_db_subnet_group" "ledger_db_subnet_group" {
  name        = "ledger-stream-db-subnet-group-${var.environment}"
  subnet_ids  = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "ledger-stream-db-subnet-group"
  }
}

# 2. Security Group for RDS
resource "aws_security_group" "rds_sg" {
  name        = "ledger-stream-rds-sg-${var.environment}"
  description = "Security group for Ledger Stream MySQL RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ledger-stream-rds-sg"
  }
}

# 3. RDS MySQL Instance with AWS Managed Password
resource "aws_db_instance" "ledgerdb" {
  identifier                  = "ledger-stream-db-${var.environment}"
  engine                      = "mysql"
  engine_version              = "8.0"
  instance_class              = "db.t3.micro"
  allocated_storage           = 20
  max_allocated_storage       = 100
  storage_type                = "gp2"

  db_name                     = "ledgerdb"
  username                    = "ledgerstream"

  # AWS automatically generates, securely stores, and manages the password
  manage_master_user_password = true

  db_subnet_group_name        = aws_db_subnet_group.ledger_db_subnet_group.name
  vpc_security_group_ids      = [aws_security_group.rds_sg.id]

  skip_final_snapshot         = var.environment == "prod" ? false : true
  publicly_accessible         = false

  tags = {
    Name = "ledger-stream-mysql"
  }
}

# 4. Store DB Username in AWS Parameter Store
resource "aws_ssm_parameter" "db_user" {
  name  = "/ledger-stream/${var.environment}/DB_USERNAME"
  type  = "String"
  value = "ledgerstream"
}

# 5. Store DB NAME in AWS Parameter Store
resource "aws_ssm_parameter" "db_name" {
  name  = "/ledger-stream/${var.environment}/DB_NAME"
  type  = "String"
  value = aws_db_instance.ledgerdb.db_name
}

# 6. Outputs
output "rds_endpoint" {
  value       = aws_db_instance.ledgerdb.endpoint
  description = "Database connection endpoint"
}

output "rds_address" {
  value       = aws_db_instance.ledgerdb.address
  description = "Database connection address"
}

output "db_secret_arn" {
  value       = aws_db_instance.ledgerdb.master_user_secret[0].secret_arn
  description = "AWS Secrets Manager ARN containing the auto-generated database password"
}
