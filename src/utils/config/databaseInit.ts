import pool from "./dbConnection";

const checkTableExists = async (tableName: string) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query<any[]>(
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
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, follower_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (follower_id) REFERENCES users(id)
)`;

const createFollowingsTable = `
CREATE TABLE IF NOT EXISTS followings (
    user_id INT NOT NULL,
    following_id INT NOT NULL,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    PRIMARY KEY (user_id, push_token_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (push_token_id) REFERENCES PushTokens(id)
)`;

export const initializeDatabase = async () => {
    const connection = await pool.getConnection();
    try {
        const usersTableExists = await checkTableExists('users');
        const followersTableExists = await checkTableExists('followers');
        const followingsTableExists = await checkTableExists('followings');
        const pushTokensTableExists = await checkTableExists('PushTokens');
        const userPushTokensTableExists = await checkTableExists('UserPushTokens');

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
    } catch (error) {
        console.error("Error initializing database: ", error);
    } finally {
        connection.release();
    }
};
