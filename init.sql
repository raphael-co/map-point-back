CREATE DATABASE IF NOT EXISTS social_network;
USE social_network;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    gender ENUM('male', 'female', 'other'),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS followers (
    user_id INT,
    follower_id INT,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, follower_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (follower_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS followings (
    user_id INT,
    following_id INT,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, following_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id)
);
-- Index pour assurer l'unicité des relations (un utilisateur ne peut pas avoir deux relations identiques avec le même ami)
CREATE UNIQUE INDEX idx_user_friend ON friends (user_id, friend_id);