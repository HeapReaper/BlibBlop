CREATE TABLE members (
     id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
     guild_id BIGINT UNSIGNED NOT NULL,
     username VARCHAR(100) NOT NULL,
     discriminator VARCHAR(5) NULL,
     display_name VARCHAR(100),
     avatar_url TEXT,
     joined_at DATETIME,
     is_bot BOOLEAN DEFAULT FALSE,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

     UNIQUE KEY unique_member (id, guild_id)
);