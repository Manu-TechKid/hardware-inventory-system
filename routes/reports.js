const express = require('express');
const db = require('../database/database');

const router = express.Router();

// Get inventory summary
router.get('/inventory-summary', (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total_items,
            SUM(quantity) as total_stock,
            SUM(quantity * unit_price) as total_value,
            COUNT(CASE WHEN quantity <= min_quantity THEN 1 END) as low_stock_items
        FROM inventory
    `;
    
    db.get(query, [], (err, summary) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(summary);
    });
});

// Get inventory by category
router.get('/inventory-by-category', (req, res) => {
    const query = `
        SELECT 
            c.name as category,
            COUNT(i.id) as item_count,
            SUM(i.quantity) as total_stock,
            SUM(i.quantity * i.unit_price) as total_value
        FROM categories c
        LEFT JOIN inventory i ON c.id = i.category_id
        GROUP BY c.id, c.name
        ORDER BY total_value DESC
    `;
    
    db.all(query, [], (err, categories) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(categories);
    });
});

// Get sales summary
router.get('/sales-summary', (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total_sales,
            SUM(total_price) as total_revenue,
            SUM(quantity) as total_items_sold,
            AVG(total_price) as average_sale_value
        FROM sales
    `;
    
    db.get(query, [], (err, summary) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(summary);
    });
});

// Get sales by date range
router.get('/sales-by-date/:start/:end', (req, res) => {
    const { start, end } = req.params;
    const query = `
        SELECT 
            DATE(sale_date) as date,
            COUNT(*) as sales_count,
            SUM(total_price) as revenue,
            SUM(quantity) as items_sold
        FROM sales
        WHERE sale_date BETWEEN ? AND ?
        GROUP BY DATE(sale_date)
        ORDER BY date
    `;
    
    db.all(query, [start, end], (err, sales) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(sales);
    });
});

// Get staff performance
router.get('/staff-performance', (req, res) => {
    const query = `
        SELECT 
            s.name as staff_name,
            COUNT(sa.id) as total_sales,
            SUM(sa.total_price) as revenue,
            AVG(sa.total_price) as average_sale,
            SUM(sa.quantity) as items_sold
        FROM staff s
        LEFT JOIN sales sa ON s.id = sa.staff_id
        WHERE s.status = 'active'
        GROUP BY s.id, s.name
        ORDER BY revenue DESC
    `;
    
    db.all(query, [], (err, performance) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(performance);
    });
});

// Get financial summary
router.get('/financial-summary', (req, res) => {
    const query = `
        SELECT 
            SUM(total_price) as total_revenue,
            COUNT(*) as total_sales,
            AVG(total_price) as average_sale,
            SUM(quantity) as total_items_sold
        FROM sales
    `;
    
    db.get(query, [], (err, summary) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(summary);
    });
});

// Get low stock alert
router.get('/low-stock-alert', (req, res) => {
    const query = `
        SELECT 
            i.name,
            i.quantity,
            i.min_quantity,
            c.name as category_name
        FROM inventory i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.quantity <= i.min_quantity
        ORDER BY i.quantity ASC
    `;
    
    db.all(query, [], (err, alerts) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(alerts);
    });
});

// Get customer history
router.get('/customer-history/:customerName', (req, res) => {
    const { customerName } = req.params;
    const query = `
        SELECT 
            s.sale_date,
            s.item_name,
            s.quantity,
            s.total_price,
            s.payment_method
        FROM sales s
        WHERE s.customer_name LIKE ?
        ORDER BY s.sale_date DESC
    `;
    
    db.all(query, [`%${customerName}%`], (err, history) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(history);
    });
});

// Get monthly trend
router.get('/monthly-trend/:year', (req, res) => {
    const { year } = req.params;
    const query = `
        SELECT 
            strftime('%m', sale_date) as month,
            SUM(total_price) as revenue,
            COUNT(*) as sales_count
        FROM sales
        WHERE strftime('%Y', sale_date) = ?
        GROUP BY strftime('%m', sale_date)
        ORDER BY month
    `;
    
    db.all(query, [year], (err, trend) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Convert month numbers to names
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const formattedTrend = trend.map(item => ({
            month: monthNames[parseInt(item.month) - 1],
            revenue: item.revenue || 0,
            sales_count: item.sales_count || 0
        }));
        
        res.json(formattedTrend);
    });
});

// Get profit margin
router.get('/profit-margin', (req, res) => {
    const query = `
        SELECT 
            i.name,
            i.unit_price,
            AVG(s.unit_price) as avg_sale_price,
            (AVG(s.unit_price) - i.unit_price) as profit_per_unit,
            ((AVG(s.unit_price) - i.unit_price) / i.unit_price * 100) as profit_margin
        FROM inventory i
        LEFT JOIN sales s ON i.id = s.item_id
        WHERE s.id IS NOT NULL
        GROUP BY i.id, i.name, i.unit_price
        ORDER BY profit_margin DESC
    `;
    
    db.all(query, [], (err, margins) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(margins);
    });
});

// Get supplier performance
router.get('/supplier-performance', (req, res) => {
    const query = `
        SELECT 
            supplier,
            COUNT(*) as items_count,
            SUM(quantity) as total_stock,
            SUM(quantity * unit_price) as total_value
        FROM inventory
        WHERE supplier IS NOT NULL AND supplier != ''
        GROUP BY supplier
        ORDER BY total_value DESC
    `;
    
    db.all(query, [], (err, suppliers) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(suppliers);
    });
});

// Get comprehensive report
router.get('/comprehensive', (req, res) => {
    const queries = {
        inventory: `
            SELECT 
                COUNT(*) as total_items,
                SUM(quantity) as total_stock,
                SUM(quantity * unit_price) as total_value
            FROM inventory
        `,
        sales: `
            SELECT 
                COUNT(*) as total_sales,
                SUM(total_price) as total_revenue,
                AVG(total_price) as average_sale
            FROM sales
        `,
        staff: `
            SELECT COUNT(*) as active_staff
            FROM staff
            WHERE status = 'active'
        `,
        lowStock: `
            SELECT COUNT(*) as low_stock_count
            FROM inventory
            WHERE quantity <= min_quantity
        `
    };
    
    Promise.all([
        new Promise((resolve, reject) => {
            db.get(queries.inventory, [], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        }),
        new Promise((resolve, reject) => {
            db.get(queries.sales, [], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        }),
        new Promise((resolve, reject) => {
            db.get(queries.staff, [], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        }),
        new Promise((resolve, reject) => {
            db.get(queries.lowStock, [], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        })
    ]).then(([inventory, sales, staff, lowStock]) => {
        res.json({
            inventory,
            sales,
            staff,
            lowStock,
            timestamp: new Date().toISOString()
        });
    }).catch(err => {
        res.status(500).json({ error: 'Database error' });
    });
});

// New chart endpoints
// Get daily sales for chart
router.get('/daily-sales', (req, res) => {
    const query = `
        SELECT 
            DATE(sale_date) as date,
            SUM(total_price) as revenue,
            COUNT(*) as sales_count
        FROM sales
        WHERE sale_date >= date('now', '-30 days')
        GROUP BY DATE(sale_date)
        ORDER BY date DESC
        LIMIT 30
    `;
    
    db.all(query, [], (err, sales) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(sales);
    });
});

// Get yearly revenue for chart
router.get('/yearly-revenue', (req, res) => {
    const query = `
        SELECT 
            strftime('%Y', sale_date) as year,
            SUM(total_price) as revenue,
            COUNT(*) as sales_count
        FROM sales
        GROUP BY strftime('%Y', sale_date)
        ORDER BY year
    `;
    
    db.all(query, [], (err, revenue) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(revenue);
    });
});

// Get sales by category for chart
router.get('/sales-by-category', (req, res) => {
    const query = `
        SELECT 
            c.name as category,
            SUM(s.total_price) as revenue,
            COUNT(s.id) as sales_count
        FROM categories c
        LEFT JOIN inventory i ON c.id = i.category_id
        LEFT JOIN sales s ON i.id = s.item_id
        WHERE s.id IS NOT NULL
        GROUP BY c.id, c.name
        ORDER BY revenue DESC
    `;
    
    db.all(query, [], (err, categories) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(categories);
    });
});

module.exports = router; 