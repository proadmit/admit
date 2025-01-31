require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function migrate() {
    // Create a connection pool
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Reading migration file...');
        const migrationPath = path.join(__dirname, 'src', 'lib', 'db', 'migration.sql');
        const sql = await fs.readFile(migrationPath, 'utf8');

        console.log('Connecting to database...');
        const client = await pool.connect();

        console.log('Running migration...');
        await client.query(sql);

        console.log('Migration completed successfully!');
        client.release();
    } catch (error) {
        console.error('Error during migration:', error);
        if (error.code === 'ENOENT') {
            console.error('Migration file not found. Please check if the file exists at:', path.join(__dirname, 'src', 'lib', 'db', 'migration.sql'));
        }
    } finally {
        await pool.end();
    }
}

migrate();
