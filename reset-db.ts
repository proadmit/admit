import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function main() {
  console.log('Starting database reset...');

  const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });
  const db = drizzle(sql);

  try {
    console.log('Reading SQL file...');
    const sqlContent = fs.readFileSync(path.join(process.cwd(), 'reset-db.sql'), 'utf8');

    console.log('Executing SQL commands...');
    await sql.unsafe(sqlContent);

    console.log('Database reset completed successfully!');
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main(); 