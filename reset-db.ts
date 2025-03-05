import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function main() {
  console.log('Starting database reset...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = postgres(process.env.DATABASE_URL, { 
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false 
  });
  
  const db = drizzle(sql);

  try {
    console.log('Reading SQL reset file...');
    const sqlContent = fs.readFileSync(path.join(process.cwd(), 'reset-db.sql'), 'utf8');

    console.log('Executing reset commands...');
    await sql.unsafe(sqlContent);

    console.log('Running latest migrations...');
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    await migrate(db, { migrationsFolder: './drizzle/migrations' });

    console.log('Database reset and migration completed successfully!');
  } catch (error) {
    console.error('Error during database reset:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main(); 