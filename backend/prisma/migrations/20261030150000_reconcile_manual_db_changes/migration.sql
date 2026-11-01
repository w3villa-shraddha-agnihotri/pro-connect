-- Add Stripe session ID column and unique index.
ALTER TABLE `payments`
ADD COLUMN `stripe_session_id` VARCHAR(191) NULL,
ADD UNIQUE INDEX `payments_stripe_session_id_key` (`stripe_session_id`);

-- Preserve the existing updated_at column definition.
ALTER TABLE `connection_requests`
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL
DEFAULT CURRENT_TIMESTAMP(3)
ON UPDATE CURRENT_TIMESTAMP(3);
