CREATE TABLE IF NOT EXISTS giveaway_participants (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    giveaway_id INT,
    user_id VARCHAR(22),
    winner int NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);