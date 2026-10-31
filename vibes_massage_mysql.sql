-- ============================================================
-- Vibes Massage Booking System - MySQL Database Schema & Seeds
-- SME Client: Vibes Massage (Circle C Mall, Quezon City Branch)
-- Compatible with: MySQL 5.7+, MySQL 8.x, MariaDB, phpMyAdmin
-- ============================================================

CREATE DATABASE IF NOT EXISTS `vibes_massage` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `vibes_massage`;

-- ------------------------------------------------------------
-- 1. Table structure for `therapists`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `therapists` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `specialization` VARCHAR(255) NOT NULL,
  `gender` ENUM('Male', 'Female') NOT NULL,
  `bio` TEXT NOT NULL,
  `years_exp` INT NOT NULL DEFAULT 1,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Table structure for `services`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `services` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `duration_minutes` INT NOT NULL,
  `price_php` DECIMAL(10,2) NOT NULL,
  `description` TEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Table structure for `staff`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `staff` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `role` ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL,
  `last_login` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_staff_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Table structure for `bookings`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reference_no` VARCHAR(50) NOT NULL UNIQUE,
  `customer_name` VARCHAR(150) NOT NULL,
  `contact_number` VARCHAR(50) NOT NULL,
  `service_id` VARCHAR(50) NOT NULL,
  `service_name` VARCHAR(150) NOT NULL,
  `oil_option` ENUM('With Oil', 'Dry') NOT NULL,
  `therapist_id` INT NOT NULL,
  `booking_date` DATE NOT NULL,
  `start_time` VARCHAR(10) NOT NULL,
  `end_time` VARCHAR(10) NOT NULL,
  `duration_minutes` INT NOT NULL,
  `status` ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `notes` TEXT NULL,
  `cancellation_reason` TEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_bookings_ref` (`reference_no`),
  INDEX `idx_bookings_date` (`booking_date`),
  INDEX `idx_bookings_therapist` (`therapist_id`),
  INDEX `idx_bookings_contact` (`contact_number`),
  CONSTRAINT `fk_bookings_therapist` FOREIGN KEY (`therapist_id`) REFERENCES `therapists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Table structure for `activity_logs`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `timestamp` DATETIME NOT NULL,
  `actor` VARCHAR(100) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT NOT NULL,
  `ip_address` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_logs_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Table structure for `rate_limit_logs`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rate_limit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ip` VARCHAR(50) NOT NULL,
  `action_type` VARCHAR(50) NOT NULL,
  `attempts` INT NOT NULL DEFAULT 1,
  `locked_until` BIGINT NOT NULL DEFAULT 0,
  `last_attempt_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_rate_limit_ip_action` (`ip`, `action_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INITIAL SEED DATA
-- ============================================================

-- Seed 10 Visually Impaired Therapists
INSERT INTO `therapists` (`id`, `name`, `title`, `specialization`, `gender`, `bio`, `years_exp`, `active`) VALUES
(1, 'Eduardo "Kuya Ed" Ramos', 'Master Therapist', 'Swedish & Deep Tissue Massage', 'Male', 'Certified licensed therapist with 8 years of dedicated practice in Swedish body release and neuromuscular relaxation.', 8, 1),
(2, 'Maria Santos', 'Senior Therapist', 'Shiatsu & Gentle Acupressure', 'Female', 'Expert in rhythmic Japanese shiatsu pressure points and tension relief with 6 years experience.', 6, 1),
(3, 'Roberto Cruz', 'Therapeutic Specialist', 'Combination Massage & Muscle Decompression', 'Male', 'Specializes in personalized whole-body tension release and restorative stretching techniques.', 7, 1),
(4, 'Teresa Mendoza', 'Holistic Practitioner', 'Aromatherapy & Calming Strokes', 'Female', 'Master of therapeutic essential oil application and stress mitigation with 5 years experience.', 5, 1),
(5, 'Juan Bautista', 'Traditional Hilot Master', 'Hilot & Targeted Body Parts', 'Male', 'Practitioner of authentic Filipino Hilot balancing and localized knot dissolution with 9 years experience.', 9, 1),
(6, 'Elena Reyes', 'Upper Body Specialist', 'Head, Neck, Shoulder & Dry Acupressure', 'Female', 'Dedicated focus on desk-fatigue, tension headaches, and localized neck relief.', 4, 1),
(7, 'Ricardo Aquino', 'Deep Pressure Specialist', 'Sports Recovery & Myofascial Therapy', 'Male', 'Deep tissue specialist working with active clients and intense physical stress release.', 8, 1),
(8, 'Grace Dela Cruz', 'Reflexology Specialist', 'Foot Reflexology & Body Restoration', 'Female', 'Certified in plantar reflexology zones and gentle full-body rejuvenation.', 6, 1),
(9, 'Antonio Morales', 'Back & Spinal Specialist', 'Back, Scapula & Spinal Alignment Care', 'Male', 'Focused care on upper/lower lumbar comfort, postural fatigue, and gentle mobilization.', 5, 1),
(10, 'Carmela Flores', 'Relaxation Specialist', 'Soothing Full-Body & Hand Therapy', 'Female', 'Known for rhythmic gentle strokes, soothing touch, and whole-body nervous system grounding.', 7, 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Seed Services
INSERT INTO `services` (`id`, `name`, `duration_minutes`, `price_php`, `description`) VALUES
('whole-body', 'Whole Body Massage', 60, 350.00, 'A complete 60-minute therapeutic full body massage relieving systemic muscle fatigue, improving blood circulation, and promoting deep serenity.'),
('body-parts', 'Body Parts Massage', 30, 200.00, 'A focused 30-minute targeted therapy for specific tension zones such as back, head/neck/shoulders, or lower legs and feet.')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Seed Initial Staff Accounts
-- Note: Passwords stored securely hashed.
-- admin -> Admin123!
-- gelyn_perez -> Vibes2026!
INSERT INTO `staff` (`id`, `username`, `password_hash`, `full_name`, `role`, `active`, `created_at`) VALUES
(1, 'admin', 'e4a896dfa5e98585e50529944a958b4b:9fb4578bce00e4e7e6008ab9e3e3b3e213bbf7976e33e9d8cb94bce43029cf05', 'System Administrator', 'admin', 1, NOW()),
(2, 'gelyn_perez', 'fa038d81cb45ef66432709dbca01a248:f86c121e7ce71eb8a2e1d034293f03b5f7e6f8510bf24510ee82df2149e612cb', 'Ms. Gelyn Perez (Branch Manager)', 'staff', 1, NOW())
ON DUPLICATE KEY UPDATE `username`=VALUES(`username`);

