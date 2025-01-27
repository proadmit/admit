import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if we're in production
const connectionString = process.env.DATABASE_URL!;

// Create the connection
const client = postgres(connectionString, { max: 1 });
export const db = drizzle(client, { schema });

// Create a query builder that includes relations
export const dbWithRelations = drizzle(client, { schema, logger: true }); 