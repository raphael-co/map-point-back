import mysql from 'mysql2/promise';
import dotenv from "dotenv";
dotenv.config();

// Create a connection pool instead of a single connection
const pool = mysql.createPool({
  host: process.env.HOST, // Use 'localhost' if running outside Docker
  port: process.env.PORTDB ? Number(process.env.PORTDB) : undefined, 
  user: process.env.USERDB,
  password: process.env.PASSWORDDB,
  database: process.env.DATABASE,
  waitForConnections: true,
  connectionLimit: 1000, // Set the limit for connections in the pool
  queueLimit: 100, // Set the limit for the queue of waiting connections
  charset: 'utf8mb4'
});

console.log(process.env.HOST);


// Function to get a connection from the pool
async function getConnection() {
  const connection = await pool.getConnection();
  console.log('Database Transfer Express is connected successfully!');
  // Release the connection back to the pool when done
  connection.release();
  return connection;
}

// Use the pool for queries directly, or use getConnection for specific tasks
export default pool;