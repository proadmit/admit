import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if we're in production
const connectionString = process.env.DATABASE_URL!;
const isProduction = process.env.NODE_ENV === 'production';

// Configure connection with SSL
const client = postgres(connectionString, {
  ssl: {
    rejectUnauthorized: false // Required for AWS RDS
  }
});

export const db = drizzle(client, { schema });

// Create a query builder that includes relations
export const dbWithRelations = drizzle(client, { 
  schema, 
  logger: !isProduction // Only log queries in development
}); 