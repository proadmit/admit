const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function updateSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const sql = fs.readFileSync('update-schema.sql', 'utf8');
        await client.query(sql);
        console.log('Schema updated successfully');
    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        await client.end();
    }
}

updateSchema(); 