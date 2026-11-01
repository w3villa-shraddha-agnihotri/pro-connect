-- CreateTable
CREATE TABLE `connection_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `professional_id` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `connection_requests_customer_id_status_idx`(`customer_id`, `status`),
    INDEX `connection_requests_professional_id_status_idx`(`professional_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `connection_request_skills` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `connection_request_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `connection_request_skills_connection_request_id_name_key`(`connection_request_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_professionals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `professional_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `saved_professionals_customer_id_idx`(`customer_id`),
    UNIQUE INDEX `saved_professionals_customer_id_professional_id_key`(`customer_id`, `professional_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `connection_requests` ADD CONSTRAINT `connection_requests_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `connection_requests` ADD CONSTRAINT `connection_requests_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `connection_request_skills` ADD CONSTRAINT `connection_request_skills_connection_request_id_fkey` FOREIGN KEY (`connection_request_id`) REFERENCES `connection_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_professionals` ADD CONSTRAINT `saved_professionals_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_professionals` ADD CONSTRAINT `saved_professionals_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
