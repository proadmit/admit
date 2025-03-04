import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if we're in production
const connectionString = process.env.DATABASE_URL!;
const isProduction = process.env.NODE_ENV === 'production';

// Create the connection with SSL in production
const client = postgres(connectionString, { 
  max: 1,
  ssl: isProduction ? {
    rejectUnauthorized: false // Allow self-signed certificates in production
  } : false,
  connect_timeout: 10, // Connection timeout in seconds
  idle_timeout: 20, // How long a connection can remain idle before being closed
  max_lifetime: 60 * 30 // Max connection lifetime in seconds (30 minutes)
});

export const db = drizzle(client, { schema });

// Create a query builder that includes relations
export const dbWithRelations = drizzle(client, { 
  schema, 
  logger: !isProduction // Only log queries in development
}); 