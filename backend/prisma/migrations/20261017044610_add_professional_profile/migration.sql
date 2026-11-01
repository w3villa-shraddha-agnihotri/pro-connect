-- CreateTable
CREATE TABLE `professional_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `bio` TEXT NULL,
    `experience_years` INTEGER NULL,
    `portfolio_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `professional_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professional_skills` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `professional_profile_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `professional_skills_professional_profile_id_name_key`(`professional_profile_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `professional_profiles` ADD CONSTRAINT `professional_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_skills` ADD CONSTRAINT `professional_skills_professional_profile_id_fkey` FOREIGN KEY (`professional_profile_id`) REFERENCES `professional_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
