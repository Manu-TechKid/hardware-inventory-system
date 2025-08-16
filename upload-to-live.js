const fs = require('fs');
const path = require('path');

console.log('=== UPLOAD BACKUP TO LIVE SITE ===\n');

// Get backup file path from command line argument
const backupFile = process.argv[2] || path.join(__dirname, 'backups', 'latest-backup.json');
const liveUrl = 'https://hardware-inventory-system.onrender.com';

if (!fs.existsSync(backupFile)) {
    console.error('❌ Backup file not found:', backupFile);
    console.log('Usage: node upload-to-live.js [backup-file.json]');
    process.exit(1);
}

async function uploadToLive() {
    try {
        console.log(`📂 Loading backup from: ${backupFile}`);
        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        
        console.log(`📅 Backup created: ${backupData.timestamp}`);
        console.log(`📊 Tables to upload: ${Object.keys(backupData.data).length}\n`);

        // Upload to live site
        console.log(`🚀 Uploading to: ${liveUrl}/api/backup/restore`);
        
        const fetch = require('node-fetch');
        const response = await fetch(`${liveUrl}/api/backup/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(backupData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        console.log(`✅ ${result.message}`);
        console.log(`📅 Completed at: ${result.timestamp}\n`);
        
        // Show results for each table
        console.log('📊 Restore Results:');
        for (const [table, info] of Object.entries(result.results)) {
            if (info.status === 'completed') {
                console.log(`  ✅ ${table}: ${info.restored}/${info.total} records restored`);
            } else {
                console.log(`  ⏭️ ${table}: ${info.status}`);
            }
        }

        console.log(`\n🎉 Data successfully uploaded to live site!`);
        console.log(`🌐 Visit: ${liveUrl}`);

    } catch (error) {
        console.error('❌ Upload failed:', error.message);
        console.log('\n💡 Make sure:');
        console.log('  - Your live site is running');
        console.log('  - The backup API is deployed');
        console.log('  - The backup file format is correct');
    }
}

uploadToLive();
