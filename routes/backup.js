const express = require('express');
const db = require('../database/database');
const router = express.Router();

// API endpoint to backup live database
router.get('/download', async (req, res) => {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            source: 'render-live-database',
            data: {}
        };

        const tables = ['categories', 'inventory', 'sales', 'staff', 'budget'];
        
        for (const table of tables) {
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
        }

        // Set headers for file download
        const timestamp = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="render-backup-${timestamp}.json"`);
        res.json(backup);

    } catch (error) {
        res.status(500).json({ error: 'Backup failed', message: error.message });
    }
});

// API endpoint to get live database info
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
            source: 'render-live-database',
            tables: results,
            total_records: results.reduce((sum, item) => sum + item.count, 0)
        });
    });
});

// API endpoint to view live data (for debugging)
router.get('/view/:table', (req, res) => {
    const { table } = req.params;
    const allowedTables = ['categories', 'inventory', 'sales', 'staff', 'budget'];
    
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    db.all(`SELECT * FROM ${table} LIMIT 100`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', message: err.message });
        }
        res.json({
            table,
            count: rows.length,
            data: rows
        });
    });
});

module.exports = router;
