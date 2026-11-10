CREATE DATABASE IF NOT EXISTS `cleanwash`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `cleanwash_testing`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'cleanwash'@'%' IDENTIFIED BY 'cleanwash_secret';
GRANT ALL PRIVILEGES ON `cleanwash`.* TO 'cleanwash'@'%';
GRANT ALL PRIVILEGES ON `cleanwash_testing`.* TO 'cleanwash'@'%';
FLUSH PRIVILEGES;
