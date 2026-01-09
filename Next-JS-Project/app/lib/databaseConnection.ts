import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

async function dbConnect(): Promise<void> {
  if (connection.isConnected) {
    console.log('Already connected to the database');
    return;
  }

  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('DATABASE_URL is not defined in your .env file');
    process.exit(1);
  }

  try {
    const db = await mongoose.connect(uri); // no extra options needed
    connection.isConnected = db.connections[0].readyState;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

export default dbConnect;
