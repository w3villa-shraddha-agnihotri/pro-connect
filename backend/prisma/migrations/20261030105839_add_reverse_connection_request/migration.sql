-- AlterTable
ALTER TABLE `connection_requests` ADD COLUMN `attachment_url` VARCHAR(191) NULL,
    ADD COLUMN `direction` VARCHAR(191) NOT NULL DEFAULT 'CUSTOMER_TO_PROFESSIONAL',
    ALTER COLUMN `updated_at` DROP DEFAULT;

-- CreateIndex
CREATE INDEX `connection_requests_direction_status_idx` ON `connection_requests`(`direction`, `status`);
