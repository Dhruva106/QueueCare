#!/bin/bash
# =============================================================================
# QueueCare — MySQL 8.0 Database Initialization & Verification Script
# Usage: ./init_mysql.sh [user] [password] [host] [port]
# Defaults: user=root, password="", host=localhost, port=3306
# =============================================================================

set -e

DB_USER="${1:-root}"
DB_PASS="${2:-}"
DB_HOST="${3:-localhost}"
DB_PORT="${4:-3306}"

echo "============================================================"
echo "  QueueCare — Hospital Queue Management Database Setup"
echo "  Target: MySQL 8.0 ($DB_HOST:$DB_PORT) | User: $DB_USER"
echo "============================================================"

MYSQL_CMD="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER"
if [ -n "$DB_PASS" ]; then
    MYSQL_CMD="$MYSQL_CMD -p$DB_PASS"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "1. Applying Relational Schema (DDL: 8 Core Tables + RBAC)..."
$MYSQL_CMD < "$SCRIPT_DIR/schema.sql"

echo "2. Populating Initial Development Seed Data (DML)..."
$MYSQL_CMD < "$SCRIPT_DIR/seed.sql"

echo "3. Creating Stored Procedures, Functions & Triggers..."
$MYSQL_CMD < "$SCRIPT_DIR/procedures_triggers.sql"

echo "============================================================"
echo "  QueueCare MySQL Database Initialized Successfully!"
echo "============================================================"
echo ""
echo "Verification Summary:"
$MYSQL_CMD -e "
USE queuecare;
SELECT 'department' AS \`Table\`, COUNT(*) AS Total_Rows FROM department
UNION ALL SELECT 'staff', COUNT(*) FROM staff
UNION ALL SELECT 'patient', COUNT(*) FROM patient
UNION ALL SELECT 'doctor', COUNT(*) FROM doctor
UNION ALL SELECT 'appointment', COUNT(*) FROM appointment
UNION ALL SELECT 'queue_entry', COUNT(*) FROM queue_entry
UNION ALL SELECT 'visit', COUNT(*) FROM visit
UNION ALL SELECT 'notification', COUNT(*) FROM notification
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log;
"
