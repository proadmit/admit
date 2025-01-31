require('dotenv').config();
const { Pool } = require('pg');

async function verifyDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        // Query to get all tables
        const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

        console.log('\nChecking tables...');
        const tables = await client.query(tablesQuery);

        console.log('\nFound tables:');
        tables.rows.forEach(table => {
            console.log(`- ${table.table_name}`);
        });

        // Get table details
        for (const table of tables.rows) {
            const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `;

            const columns = await client.query(columnsQuery, [table.table_name]);

            console.log(`\nTable: ${table.table_name}`);
            console.log('Columns:');
            columns.rows.forEach(column => {
                console.log(`  - ${column.column_name} (${column.data_type}, ${column.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
        }

        client.release();
    } catch (error) {
        console.error('Error verifying database:', error);
    } finally {
        await pool.end();
    }
}

verifyDatabase(); 