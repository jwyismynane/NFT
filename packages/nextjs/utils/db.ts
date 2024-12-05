import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'zpzch1988+',
  database: 'nft',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const connectToDatabase = async () => {
  try {
   return pool.getConnection();
   
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
};