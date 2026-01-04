import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

export async function connectDB() {
  try {
    // Test connection
    await client`SELECT 1`;
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await client.end();
    console.log('👋 Database disconnected');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
}

export { schema };
