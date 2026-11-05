-- =============================================================================
-- QueueCare: Dedicated Database User & Privileges Provisioning Script
-- =============================================================================

CREATE DATABASE IF NOT EXISTS queuecare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated non-root application user for local development and review
CREATE USER IF NOT EXISTS 'queuecare_user'@'localhost' IDENTIFIED BY 'queuecare_pass';
CREATE USER IF NOT EXISTS 'queuecare_user'@'127.0.0.1' IDENTIFIED BY 'queuecare_pass';

-- Grant required schema privileges
GRANT ALL PRIVILEGES ON queuecare.* TO 'queuecare_user'@'localhost';
GRANT ALL PRIVILEGES ON queuecare.* TO 'queuecare_user'@'127.0.0.1';

FLUSH PRIVILEGES;
