const db = require('./database/database');
const fs = require('fs');
const path = require('path');

console.log('=== DATABASE BACKUP UTILITY ===\n');

// Create backups directory if it doesn't exist
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

async function backupDatabase() {
    const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {}
    };

    try {
        // Backup all tables
        const tables = ['categories', 'inventory', 'sales', 'staff', 'budget', 'users'];
        
        for (const table of tables) {
            console.log(`Backing up ${table}...`);
            
            const data = await new Promise((resolve, reject) => {
                db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
                    if (err) {
                        console.log(`Warning: Could not backup ${table} - ${err.message}`);
                        resolve([]);
                    } else {
                        resolve(rows);
                    }
                });
            });
            
            backup.data[table] = data;
            console.log(`✅ ${table}: ${data.length} records`);
        }

        // Save backup to file
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
        console.log(`\n🎉 Backup completed successfully!`);
        console.log(`📁 Backup saved to: ${backupFile}`);
        console.log(`📊 Total tables backed up: ${Object.keys(backup.data).length}`);
        
        // Also create a copy with simple name for easy access
        const latestBackup = path.join(backupDir, 'latest-backup.json');
        fs.writeFileSync(latestBackup, JSON.stringify(backup, null, 2));
        console.log(`📋 Latest backup: ${latestBackup}`);

    } catch (error) {
        console.error('❌ Backup failed:', error);
    } finally {
        db.close();
    }
}

backupDatabase();
