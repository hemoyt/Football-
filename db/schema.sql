-- ═══════════════════════════════════════════════════════════════
-- GOG (Gateway of Goals) — Database Schema
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS gog_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gog_db;

-- ═══════════════════════════════════════
-- TABLE 1: users (base auth table)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(191)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  role            ENUM('player','club','admin') NOT NULL,
  is_active       TINYINT(1)    DEFAULT 1,
  is_deleted      TINYINT(1)    DEFAULT 0,
  last_login      DATETIME      NULL,
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role  (role),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 2: player_profiles
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS player_profiles (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED NOT NULL UNIQUE,
  full_name           VARCHAR(120) NOT NULL,
  date_of_birth       DATE         NOT NULL,
  nationality         VARCHAR(80)  NOT NULL,
  country_residence   VARCHAR(80)  NOT NULL,
  position_primary    ENUM('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') NOT NULL,
  position_secondary  ENUM('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') NULL,
  preferred_foot      ENUM('left','right','both') NOT NULL,
  height_cm           SMALLINT UNSIGNED NULL,
  weight_kg           SMALLINT UNSIGNED NULL,
  bio                 VARCHAR(300) NULL,
  photo_url           VARCHAR(500) NULL,
  instagram_url       VARCHAR(255) NULL,
  youtube_url         VARCHAR(255) NULL,
  profile_views       INT UNSIGNED DEFAULT 0,
  is_deleted          TINYINT(1)   DEFAULT 0,
  created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_position    (position_primary),
  INDEX idx_nationality (nationality),
  INDEX idx_dob         (date_of_birth),
  INDEX idx_height      (height_cm),
  INDEX idx_foot        (preferred_foot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 3: player_skills
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS player_skills (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id   INT UNSIGNED NOT NULL UNIQUE,
  speed       TINYINT UNSIGNED DEFAULT 50,
  dribbling   TINYINT UNSIGNED DEFAULT 50,
  shooting    TINYINT UNSIGNED DEFAULT 50,
  passing     TINYINT UNSIGNED DEFAULT 50,
  defending   TINYINT UNSIGNED DEFAULT 50,
  heading     TINYINT UNSIGNED DEFAULT 50,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES player_profiles(id),
  CONSTRAINT chk_speed     CHECK (speed     BETWEEN 0 AND 100),
  CONSTRAINT chk_dribbling CHECK (dribbling BETWEEN 0 AND 100),
  CONSTRAINT chk_shooting  CHECK (shooting  BETWEEN 0 AND 100),
  CONSTRAINT chk_passing   CHECK (passing   BETWEEN 0 AND 100),
  CONSTRAINT chk_defending CHECK (defending BETWEEN 0 AND 100),
  CONSTRAINT chk_heading   CHECK (heading   BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 4: player_career_history
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS player_career_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id   INT UNSIGNED   NOT NULL,
  club_name   VARCHAR(120)   NOT NULL,
  season      VARCHAR(20)    NOT NULL,
  appearances SMALLINT UNSIGNED DEFAULT 0,
  goals       SMALLINT UNSIGNED DEFAULT 0,
  assists     SMALLINT UNSIGNED DEFAULT 0,
  sort_order  TINYINT UNSIGNED  DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES player_profiles(id),
  INDEX idx_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 5: player_videos
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS player_videos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id   INT UNSIGNED NOT NULL,
  video_type  ENUM('upload','youtube','vimeo') NOT NULL,
  video_url   VARCHAR(500) NOT NULL,
  title       VARCHAR(150) NULL,
  is_primary  TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES player_profiles(id),
  INDEX idx_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 6: club_profiles
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS club_profiles (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED NOT NULL UNIQUE,
  club_name           VARCHAR(150) NOT NULL,
  country             VARCHAR(80)  NOT NULL,
  league_division     VARCHAR(120) NULL,
  contact_person_name VARCHAR(120) NOT NULL,
  contact_title       VARCHAR(80)  NULL,
  phone               VARCHAR(30)  NULL,
  logo_url            VARCHAR(500) NULL,
  doc_url             VARCHAR(500) NOT NULL,
  verification_status ENUM('pending','verified','rejected') DEFAULT 'pending',
  verified_at         DATETIME     NULL,
  verified_by         INT UNSIGNED NULL,
  rejection_reason    VARCHAR(500) NULL,
  is_deleted          TINYINT(1)   DEFAULT 0,
  created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)      REFERENCES users(id),
  FOREIGN KEY (verified_by)  REFERENCES users(id),
  INDEX idx_status  (verification_status),
  INDEX idx_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 7: contact_requests
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS contact_requests (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  club_id      INT UNSIGNED NOT NULL,
  player_id    INT UNSIGNED NOT NULL,
  status       ENUM('pending','accepted','declined') DEFAULT 'pending',
  message      VARCHAR(500) NULL,
  sent_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME     NULL,
  FOREIGN KEY (club_id)   REFERENCES club_profiles(id),
  FOREIGN KEY (player_id) REFERENCES player_profiles(id),
  UNIQUE KEY unique_request (club_id, player_id),
  INDEX idx_player (player_id),
  INDEX idx_club   (club_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 8: saved_players (club bookmarks)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS saved_players (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  club_id   INT UNSIGNED NOT NULL,
  player_id INT UNSIGNED NOT NULL,
  saved_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id)   REFERENCES club_profiles(id),
  FOREIGN KEY (player_id) REFERENCES player_profiles(id),
  UNIQUE KEY unique_save (club_id, player_id),
  INDEX idx_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 9: profile_views_log
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS profile_views_log (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id INT UNSIGNED NOT NULL,
  viewed_by INT UNSIGNED NOT NULL,
  viewed_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES player_profiles(id),
  FOREIGN KEY (viewed_by) REFERENCES users(id),
  INDEX idx_player (player_id),
  INDEX idx_date   (viewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 10: system_logs
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id    INT UNSIGNED NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50)  NULL,
  target_id   INT UNSIGNED NULL,
  meta        JSON         NULL,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action  (action),
  INDEX idx_created (created_at),
  INDEX idx_actor   (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- TABLE 11: notifications
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  type       VARCHAR(60)  NOT NULL,
  title      VARCHAR(150) NOT NULL,
  body       VARCHAR(300) NULL,
  is_read    TINYINT(1)   DEFAULT 0,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- SEED: Default admin user
-- Password: Admin@GOG2024 (change immediately in production)
-- Hash generated with password_hash('Admin@GOG2024', PASSWORD_BCRYPT)
-- ═══════════════════════════════════════
INSERT IGNORE INTO users (email, password_hash, role, is_active)
VALUES (
  'admin@gog.football',
  '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  1
);
