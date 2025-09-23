CREATE TABLE IF NOT EXISTS giveaway_participants (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    giveaway_id INT,
    user_id VARCHAR(22),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);