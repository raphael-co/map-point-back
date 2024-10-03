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
    role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    connection_type ENUM('mail', 'google', 'ios') NOT NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createFollowersTable = `
CREATE TABLE IF NOT EXISTS followers (
    user_id INT NOT NULL,
    follower_id INT NOT NULL,
    followed_at TIMESTAMP NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    PRIMARY KEY (user_id, follower_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createFollowingsTable = `
CREATE TABLE IF NOT EXISTS followings (
    user_id INT NOT NULL,
    following_id INT NOT NULL,
    following_at TIMESTAMP NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    PRIMARY KEY (user_id, following_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createPushTokensTable = `
CREATE TABLE IF NOT EXISTS PushTokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createUserPushTokensTable = `
CREATE TABLE IF NOT EXISTS UserPushTokens (
    user_id INT NOT NULL,
    push_token_id INT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id, push_token_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (push_token_id) REFERENCES PushTokens(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createPasswordResetTokensTable = `
CREATE TABLE IF NOT EXISTS PasswordResetTokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(8) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

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
    blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createMarkerImagesTable = `
CREATE TABLE IF NOT EXISTS MarkerImages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marker_id INT NOT NULL,
    user_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES Markers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createMarkerCommentsTable = `
CREATE TABLE IF NOT EXISTS MarkerComments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marker_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    rating TINYINT(1) NOT NULL DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES Markers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createRatingLabelsTable = `
CREATE TABLE IF NOT EXISTS RatingLabels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marker_type ENUM('park', 'restaurant', 'bar', 'cafe', 'museum', 'monument', 'store', 'hotel', 'beach', 'other') NOT NULL,
    label VARCHAR(255) NOT NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createMarkerRatingsTable = `
CREATE TABLE IF NOT EXISTS MarkerRatings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marker_id INT NOT NULL,
    label_id INT NOT NULL,
    rating TINYINT(1) NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES Markers(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES RatingLabels(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createNotificationsTable = `
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receiver_user_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    type ENUM('follow', 'following','like', 'comment', 'mention', 'marker', 'other') NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_id INT NULL,
    FOREIGN KEY (receiver_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createAnnouncementsTable = `
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content LONGBLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    author_id INT NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createActiveUsersTable = `
CREATE TABLE IF NOT EXISTS ActiveUsers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    UNIQUE KEY unique_active_user (user_id, year, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createDocumentationTable = `
CREATE TABLE IF NOT EXISTS documentation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content LONGBLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    author_id INT NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const updateForeignKeyWithCascade = async (tableName: string, columnName: string, referencedTable: string, referencedColumn: string): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        // Récupérer la contrainte FOREIGN KEY existante pour la colonne
        const [existingForeignKey] = await connection.query<RowDataPacket[]>(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.key_column_usage 
            WHERE table_schema = DATABASE() 
            AND table_name = ? 
            AND column_name = ? 
            AND referenced_table_name IS NOT NULL;
        `, [tableName, columnName]);

        if (existingForeignKey.length > 0) {
            const constraintName = existingForeignKey[0].CONSTRAINT_NAME;

            // Supprimer la clé étrangère existante
            await connection.query(`
                ALTER TABLE ${tableName} DROP FOREIGN KEY ${constraintName};
            `);
            console.log(`Foreign key '${constraintName}' on column '${columnName}' in table '${tableName}' has been dropped.`);

            // Recréer la clé étrangère avec ON DELETE CASCADE
            await connection.query(`
                ALTER TABLE ${tableName}
                ADD CONSTRAINT fk_${tableName}_${columnName}
                FOREIGN KEY (${columnName}) REFERENCES ${referencedTable}(${referencedColumn}) ON DELETE CASCADE;
            `);
            console.log(`Foreign key on column '${columnName}' in table '${tableName}' has been added with ON DELETE CASCADE.`);
        } else {
            console.log(`No existing foreign key found on column '${columnName}' in table '${tableName}'. Adding new one with ON DELETE CASCADE.`);

            // Si aucune clé étrangère n'existe, en créer une nouvelle directement
            await connection.query(`
                ALTER TABLE ${tableName}
                ADD CONSTRAINT fk_${tableName}_${columnName}
                FOREIGN KEY (${columnName}) REFERENCES ${referencedTable}(${referencedColumn}) ON DELETE CASCADE;
            `);
        }
    } catch (error) {
        console.error(`Error updating foreign key for column '${columnName}' in table '${tableName}':`, error);
        throw error;
    } finally {
        connection.release();
    }
};

export const updateDatabaseForeignKeys = async (): Promise<void> => {
    try {
        // Mise à jour des FOREIGN KEY dans la table 'followers'
        await updateForeignKeyWithCascade('followers', 'user_id', 'users', 'id');
        await updateForeignKeyWithCascade('followers', 'follower_id', 'users', 'id');

        // Mise à jour des FOREIGN KEY dans la table 'followings'
        await updateForeignKeyWithCascade('followings', 'user_id', 'users', 'id');
        await updateForeignKeyWithCascade('followings', 'following_id', 'users', 'id');

        // Mise à jour des FOREIGN KEY dans la table 'Markers'
        await updateForeignKeyWithCascade('Markers', 'user_id', 'users', 'id');

        // Mise à jour des FOREIGN KEY dans la table 'MarkerImages'
        await updateForeignKeyWithCascade('MarkerImages', 'marker_id', 'Markers', 'id');
        await updateForeignKeyWithCascade('MarkerImages', 'user_id', 'users', 'id');

        // Mise à jour des FOREIGN KEY dans la table 'MarkerComments'
        await updateForeignKeyWithCascade('MarkerComments', 'marker_id', 'Markers', 'id');
        await updateForeignKeyWithCascade('MarkerComments', 'user_id', 'users', 'id');

        // Mise à jour des FOREIGN KEY dans la table 'ActiveUsers'
        await updateForeignKeyWithCascade('ActiveUsers', 'user_id', 'users', 'id');

        // Mise à jour des FOREIGN KEY dans la table 'UserPushTokens'
        await updateForeignKeyWithCascade('UserPushTokens', 'user_id', 'users', 'id');

        // Mise à jour des FOREIGN KEY dans la table 'MarkerRatings'
        await updateForeignKeyWithCascade('MarkerRatings', 'marker_id', 'Markers', 'id');

         // Mise à jour des FOREIGN KEY dans la table 'PasswordResetTokens'
         await updateForeignKeyWithCascade('PasswordResetTokens', 'user_id', 'users', 'id');

        // Mise à jour des FOREIGN KEY dans la table 'notifications'
        await updateForeignKeyWithCascade('notifications', 'receiver_user_id', 'users', 'id');
        await updateForeignKeyWithCascade('notifications', 'sender_user_id', 'users', 'id');

        console.log('Foreign keys updated successfully with ON DELETE CASCADE.');
    } catch (error) {
        console.error('Error updating foreign keys with ON DELETE CASCADE: ', error);
    }
};




// Fonction d'initialisation de la base de données
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
        const ratingLabelsTableExists = await checkTableExists('RatingLabels');
        const markerRatingsTableExists = await checkTableExists('MarkerRatings');
        const notificationsTableExists = await checkTableExists('notifications');
        const announcementsTableExists = await checkTableExists('announcements');
        const activeUsersTableExists = await checkTableExists('ActiveUsers');
        const documentationTableExists = await checkTableExists('documentation');

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

        if (!ratingLabelsTableExists) {
            await connection.query(createRatingLabelsTable);
            console.log("RatingLabels table created successfully");
        } else {
            console.log("RatingLabels table already exists");
        }

        if (!markerRatingsTableExists) {
            await connection.query(createMarkerRatingsTable);
            console.log("MarkerRatings table created successfully");
        } else {
            console.log("MarkerRatings table already exists");
        }

        if (!notificationsTableExists) {
            await connection.query(createNotificationsTable);
            console.log("Notifications table created successfully");
        } else {
            console.log("Notifications table already exists");
        }

        if (!announcementsTableExists) {
            await connection.query(createAnnouncementsTable);
            console.log("Announcements table created successfully");
        } else {
            console.log("Announcements table already exists");
        }

        if (!activeUsersTableExists) {
            await connection.query(createActiveUsersTable);
            console.log("ActiveUsers table created successfully");
        } else {
            console.log("ActiveUsers table already exists");
        }

        if (!documentationTableExists) {
            await connection.query(createDocumentationTable);
            console.log("Documentation table created successfully");
        } else {
            console.log("Documentation table already exists");
        }

        // Appel de la mise à jour des clés étrangères après l'initialisation des tables
        await updateDatabaseForeignKeys();

        console.log("Database initialized successfully");
    } catch (error) {
        console.error("Error initializing database: ", error);
    } finally {
        connection.release();
    }
};
