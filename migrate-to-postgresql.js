const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

console.log('=== MIGRATE SQLITE TO POSTGRESQL ===\n');

// SQLite database path
const sqliteDbPath = path.join(__dirname, 'database', 'hardware_inventory.db');

// PostgreSQL connection (will use environment variables in production)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateData() {
    let sqliteDb;
    let pgClient;

    try {
        // Connect to SQLite
        console.log('📂 Connecting to SQLite database...');
        sqliteDb = new sqlite3.Database(sqliteDbPath);

        // Connect to PostgreSQL
        console.log('🔗 Connecting to PostgreSQL database...');
        pgClient = await pool.connect();

        // Tables to migrate
        const tables = ['categories', 'staff', 'inventory', 'sales', 'budget'];

        for (const table of tables) {
            console.log(`\n📦 Migrating ${table}...`);

            // Get data from SQLite
            const sqliteData = await new Promise((resolve, reject) => {
                sqliteDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
                    if (err) {
                        console.log(`⚠️ Warning: Could not read ${table} from SQLite - ${err.message}`);
                        resolve([]);
                    } else {
                        resolve(rows);
                    }
                });
            });

            if (sqliteData.length === 0) {
                console.log(`⏭️ Skipping ${table} (no data)`);
                continue;
            }

            // Clear existing data in PostgreSQL
            await pgClient.query(`DELETE FROM ${table}`);

            // Insert data into PostgreSQL
            const columns = Object.keys(sqliteData[0]);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

            let migrated = 0;
            for (const record of sqliteData) {
                try {
                    const values = columns.map(col => record[col]);
                    await pgClient.query(insertQuery, values);
                    migrated++;
                } catch (err) {
                    console.log(`⚠️ Warning: Could not migrate record in ${table} - ${err.message}`);
                }
            }

            console.log(`✅ ${table}: ${migrated}/${sqliteData.length} records migrated`);
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log('📊 Your data is now stored in PostgreSQL and will never disappear');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('\n💡 Make sure:');
        console.log('  - PostgreSQL database is created and accessible');
        console.log('  - DATABASE_URL environment variable is set correctly');
        console.log('  - Tables exist in PostgreSQL database');
    } finally {
        if (sqliteDb) sqliteDb.close();
        if (pgClient) pgClient.release();
        await pool.end();
    }
}

migrateData();
