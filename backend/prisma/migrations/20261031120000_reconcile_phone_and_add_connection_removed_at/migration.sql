-- Add users.phone only if it does not already exist.
SET @phone_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'phone'
);

SET @sql = IF(
    @phone_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(191) NULL',
    'SELECT 1'
);

PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;


-- Add connection_removed_at only if it does not already exist.
SET @removed_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'connection_requests'
      AND COLUMN_NAME = 'connection_removed_at'
);

SET @sql = IF(
    @removed_exists = 0,
    'ALTER TABLE `connection_requests` ADD COLUMN `connection_removed_at` DATETIME(3) NULL',
    'SELECT 1'
);

PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;


-- Add composite index only if it does not already exist.
SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'connection_requests'
      AND INDEX_NAME = 'cr_pair_removed_idx'
);

SET @sql = IF(
    @index_exists = 0,
    'CREATE INDEX `cr_pair_removed_idx` ON `connection_requests` (`customer_id`, `professional_id`, `connection_removed_at`)',
    'SELECT 1'
);

PREPARE migration_stmt FROM @sql;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;
