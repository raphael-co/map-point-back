import pool from "./dbConnection";
import { RowDataPacket } from "mysql2/promise";

const checkTableExists = async (tableName: string): Promise<boolean> => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT TABLE_NAME 
             FROM information_schema.tables 
             WHERE table_schema = DATABASE() 
             AND table_name = ?`,
            [tableName]
        );
        return rows.length > 0;
    } catch (error) {
        console.error(`Error checking table ${tableName}:`, error);
        throw error;
    } finally {
        connection.release();
    }
};

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255),
    profile_image_url VARCHAR(255),
    gender ENUM('male', 'female', 'other'),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    connection_type ENUM('mail', 'google', 'ios') NOT NULL
)`;

const createFollowersTable = `
CREATE TABLE IF NOT EXISTS followers (
    user_id INT NOT NULL,
    follower_id INT NOT NULL,
    followed_at TIMESTAMP NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    PRIMARY KEY (user_id, follower_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (follower_id) REFERENCES users(id)
)`;

const createFollowingsTable = `
CREATE TABLE IF NOT EXISTS followings (
    user_id INT NOT NULL,
    following_id INT NOT NULL,
    following_at TIMESTAMP NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    PRIMARY KEY (user_id, following_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id)
)`;

const createPushTokensTable = `
CREATE TABLE IF NOT EXISTS PushTokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

const createUserPushTokensTable = `
CREATE TABLE IF NOT EXISTS UserPushTokens (
    user_id INT NOT NULL,
    push_token_id INT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id, push_token_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (push_token_id) REFERENCES PushTokens(id)
)`;

const createPasswordResetTokensTable = `
CREATE TABLE IF NOT EXISTS PasswordResetTokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(8) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
)`;

const createMarkersTable = `
CREATE TABLE IF NOT EXISTS Markers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    visibility ENUM('private', 'friends', 'public') DEFAULT 'public',
    type ENUM('park', 'restaurant', 'bar', 'cafe', 'museum', 'monument', 'store', 'hotel', 'beach', 'other') NOT NULL,
    comfort_rating TINYINT(1) CHECK (comfort_rating BETWEEN 1 AND 5),
    noise_rating TINYINT(1) CHECK (noise_rating BETWEEN 1 AND 5),
    cleanliness_rating TINYINT(1) CHECK (cleanliness_rating BETWEEN 1 AND 5),
    accessibility_rating TINYINT(1) CHECK (accessibility_rating BETWEEN 1 AND 5),
    safety_rating TINYINT(1) CHECK (safety_rating BETWEEN 1 AND 5),
    overall_rating TINYINT(1) CHECK (overall_rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)`;

const createMarkerImagesTable = `
CREATE TABLE IF NOT EXISTS MarkerImages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marker_id INT NOT NULL,
    user_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES Markers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)`;

const createMarkerCommentsTable = `
CREATE TABLE IF NOT EXISTS MarkerComments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marker_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES Markers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)`;

const createMarkerRatingsTable = `
CREATE TABLE IF NOT EXISTS MarkerRatings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marker_id INT NOT NULL,
    user_id INT NOT NULL,
    rating TINYINT(1) NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES Markers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)`;

export const initializeDatabase = async (): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const usersTableExists = await checkTableExists('users');
        const followersTableExists = await checkTableExists('followers');
        const followingsTableExists = await checkTableExists('followings');
        const pushTokensTableExists = await checkTableExists('PushTokens');
        const userPushTokensTableExists = await checkTableExists('UserPushTokens');
        const passwordResetTokensTableExists = await checkTableExists('PasswordResetTokens');
        const markersTableExists = await checkTableExists('Markers');
        const markerImagesTableExists = await checkTableExists('MarkerImages');
        const markerCommentsTableExists = await checkTableExists('MarkerComments');
        const markerRatingsTableExists = await checkTableExists('MarkerRatings');

        if (!usersTableExists) {
            await connection.query(createUsersTable);
            console.log("Users table created successfully");
        } else {
            console.log("Users table already exists");
        }

        if (!followersTableExists) {
            await connection.query(createFollowersTable);
            console.log("Followers table created successfully");
        } else {
            console.log("Followers table already exists");
        }

        if (!followingsTableExists) {
            await connection.query(createFollowingsTable);
            console.log("Followings table created successfully");
        } else {
            console.log("Followings table already exists");
        }

        if (!pushTokensTableExists) {
            await connection.query(createPushTokensTable);
            console.log("PushTokens table created successfully");
        } else {
            console.log("PushTokens table already exists");
        }

        if (!userPushTokensTableExists) {
            await connection.query(createUserPushTokensTable);
            console.log("UserPushTokens table created successfully");
        } else {
            console.log("UserPushTokens table already exists");
        }

        if (!passwordResetTokensTableExists) {
            await connection.query(createPasswordResetTokensTable);
            console.log("PasswordResetTokens table created successfully");
        } else {
            console.log("PasswordResetTokens table already exists");
        }

        if (!markersTableExists) {
            await connection.query(createMarkersTable);
            console.log("Markers table created successfully");
        } else {
            console.log("Markers table already exists");
        }

        if (!markerImagesTableExists) {
            await connection.query(createMarkerImagesTable);
            console.log("MarkerImages table created successfully");
        } else {
            console.log("MarkerImages table already exists");
        }

        if (!markerCommentsTableExists) {
            await connection.query(createMarkerCommentsTable);
            console.log("MarkerComments table created successfully");
        } else {
            console.log("MarkerComments table already exists");
        }

        if (!markerRatingsTableExists) {
            await connection.query(createMarkerRatingsTable);
            console.log("MarkerRatings table created successfully");
        } else {
            console.log("MarkerRatings table already exists");
        }

    } catch (error) {
        console.error("Error initializing database: ", error);
    } finally {
        connection.release();
    }
};
