import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

export async function connectDB(): Promise<void> {
  try {
    // Test connection
    await client`SELECT 1`;
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await client.end();
    console.log('👋 Database disconnected');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
}

export { schema };
