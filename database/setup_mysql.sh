#!/bin/bash
# =============================================================================
# QueueCare: Complete Interactive / Automated MySQL 8.0 Setup & Repair Script
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "============================================================"
echo "  QueueCare — Hospital Queue Management MySQL 8.0 Setup"
echo "============================================================"

# Try to detect mysql binary
MYSQL_BIN=""
if [ -x "/usr/local/mysql/bin/mysql" ]; then
    MYSQL_BIN="/usr/local/mysql/bin/mysql"
elif [ -x "/opt/homebrew/bin/mysql" ]; then
    MYSQL_BIN="/opt/homebrew/bin/mysql"
elif command -v mysql >/dev/null 2>&1; then
    MYSQL_BIN="$(command -v mysql)"
else
    echo "ERROR: MySQL client binary not found. Please ensure MySQL 8.0 is installed."
    exit 1
fi

echo "Using MySQL client: $MYSQL_BIN"

# Check if environment variables are provided, otherwise prompt
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-}"
DB_PASS="${DB_PASS:-}"

# Check if queuecare_user already works
CAN_CONNECT_APP_USER=false
if "$MYSQL_BIN" -h "$DB_HOST" -P "$DB_PORT" -u queuecare_user -pqueuecare_pass -e "USE queuecare; SELECT 1;" >/dev/null 2>&1; then
    CAN_CONNECT_APP_USER=true
fi

if [ "$CAN_CONNECT_APP_USER" = true ]; then
    echo "✓ Detected existing dedicated user 'queuecare_user'. Using configured credentials."
    EXEC_CMD="$MYSQL_BIN -h $DB_HOST -P $DB_PORT -u queuecare_user -pqueuecare_pass"
else
    # Need to run with root to provision database and queuecare_user
    echo ""
    echo "To initialize the QueueCare MySQL database and provision a dedicated user,"
    echo "please enter your MySQL root password (leave blank and press Enter if none):"
    
    if [ -z "$DB_PASS" ]; then
        read -s -p "MySQL root password: " DB_PASS
        echo ""
    fi
    
    if [ -n "$DB_PASS" ]; then
        ROOT_CMD="$MYSQL_BIN -h $DB_HOST -P $DB_PORT -u root -p$DB_PASS"
    else
        ROOT_CMD="$MYSQL_BIN -h $DB_HOST -P $DB_PORT -u root"
    fi
    
    echo "1. Creating database and dedicated 'queuecare_user'..."
    $ROOT_CMD < "$SCRIPT_DIR/create_db_user.sql"
    
    EXEC_CMD="$MYSQL_BIN -h $DB_HOST -P $DB_PORT -u queuecare_user -pqueuecare_pass"
fi

echo "2. Applying Relational Schema (10 Normalized Tables & Constraints)..."
$EXEC_CMD < "$SCRIPT_DIR/schema.sql"

echo "3. Populating Seed Data (Departments, Staff, Patients, Doctors, Schedule)..."
$EXEC_CMD < "$SCRIPT_DIR/seed.sql"

echo "4. Creating Stored Procedures, Functions & Triggers..."
$EXEC_CMD < "$SCRIPT_DIR/procedures_triggers.sql"

# Generate or update .env.local with authoritative MySQL configuration
ENV_LOCAL_PATH="$ROOT_DIR/.env.local"
if [ ! -f "$ENV_LOCAL_PATH" ]; then
    echo "5. Generating $ENV_LOCAL_PATH..."
    cat > "$ENV_LOCAL_PATH" <<EOF
# QueueCare Local Environment Configuration
NODE_ENV=development
PORT=3000
BACKEND_PORT=5001
BACKEND_URL=http://127.0.0.1:5001

# Authoritative MySQL Database Configuration
DB_TYPE=mysql
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=queuecare_user
DB_PASSWORD=queuecare_pass
DB_NAME=queuecare

# JWT Session Secret
AUTH_SECRET=queuecare_super_secure_jwt_session_secret_2026
EOF
    echo "✓ Created $ENV_LOCAL_PATH"
else
    echo "5. Updating DB_TYPE=mysql in $ENV_LOCAL_PATH..."
    # Ensure DB_TYPE=mysql is set in .env.local
    if grep -q "DB_TYPE=" "$ENV_LOCAL_PATH"; then
        sed -i '' 's/^DB_TYPE=.*/DB_TYPE=mysql/' "$ENV_LOCAL_PATH"
    else
        echo "DB_TYPE=mysql" >> "$ENV_LOCAL_PATH"
    fi
fi

echo ""
echo "============================================================"
echo "  QueueCare MySQL 8.0 Database Setup Completed Successfully!"
echo "============================================================"
echo ""
echo "Database Table Summary:"
$EXEC_CMD -e "
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

echo ""
echo "Stored Procedures & Functions:"
$EXEC_CMD -e "
SELECT ROUTINE_NAME, ROUTINE_TYPE 
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_SCHEMA = 'queuecare';
"

