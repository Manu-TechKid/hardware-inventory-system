const db = require('./database/database');
const fs = require('fs');
const path = require('path');

console.log('=== DATABASE RESTORE UTILITY ===\n');

// Get backup file path from command line argument or use latest
const backupFile = process.argv[2] || path.join(__dirname, 'backups', 'latest-backup.json');

if (!fs.existsSync(backupFile)) {
    console.error('❌ Backup file not found:', backupFile);
    console.log('Usage: node restore-database.js [backup-file.json]');
    process.exit(1);
}

async function restoreDatabase() {
    try {
        console.log(`📂 Loading backup from: ${backupFile}`);
        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        
        console.log(`📅 Backup created: ${backupData.timestamp}`);
        console.log(`📊 Tables to restore: ${Object.keys(backupData.data).length}\n`);

        // Clear existing data (except users table for security)
        const tablesToClear = ['categories', 'inventory', 'sales', 'staff', 'budget'];
        
        for (const table of tablesToClear) {
            await new Promise((resolve, reject) => {
                db.run(`DELETE FROM ${table}`, [], (err) => {
                    if (err) {
                        console.log(`Warning: Could not clear ${table} - ${err.message}`);
                    } else {
                        console.log(`🗑️ Cleared ${table}`);
                    }
                    resolve();
                });
            });
        }

        // Restore data
        for (const [tableName, records] of Object.entries(backupData.data)) {
            if (records.length === 0) {
                console.log(`⏭️ Skipping ${tableName} (no data)`);
                continue;
            }

            console.log(`📥 Restoring ${tableName}...`);
            
            // Get column names from first record
            const columns = Object.keys(records[0]);
            const placeholders = columns.map(() => '?').join(', ');
            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

            let restored = 0;
            for (const record of records) {
                const values = columns.map(col => record[col]);
                
                await new Promise((resolve) => {
                    db.run(query, values, function(err) {
                        if (err) {
                            console.log(`Warning: Could not restore record in ${tableName} - ${err.message}`);
                        } else {
                            restored++;
                        }
                        resolve();
                    });
                });
            }
            
            console.log(`✅ ${tableName}: ${restored}/${records.length} records restored`);
        }

        console.log(`\n🎉 Database restore completed!`);
        console.log(`📊 All data has been restored from backup`);

    } catch (error) {
        console.error('❌ Restore failed:', error);
    } finally {
        db.close();
    }
}

restoreDatabase();
