// Add this to your routes or create a new backup route file
const express = require('express');
const db = require('../database/database');
const router = express.Router();

// API endpoint to backup database
router.get('/backup', async (req, res) => {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {}
        };

        const tables = ['categories', 'inventory', 'sales', 'staff', 'budget'];
        
        for (const table of tables) {
            const data = await new Promise((resolve, reject) => {
                db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(rows);
                    }
                });
            });
            backup.data[table] = data;
        }

        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(backup);

    } catch (error) {
        res.status(500).json({ error: 'Backup failed', message: error.message });
    }
});

// API endpoint to get backup status/info
router.get('/info', (req, res) => {
    const tables = ['categories', 'inventory', 'sales', 'staff', 'budget'];
    const promises = tables.map(table => {
        return new Promise((resolve) => {
            db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, result) => {
                resolve({ table, count: err ? 0 : result.count });
            });
        });
    });

    Promise.all(promises).then(results => {
        res.json({
            timestamp: new Date().toISOString(),
            tables: results,
            total_records: results.reduce((sum, item) => sum + item.count, 0)
        });
    });
});

module.exports = router;
