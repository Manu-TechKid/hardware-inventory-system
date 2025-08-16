const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');

const router = express.Router();

// Get all sales
router.get('/', (req, res) => {
    const query = `
        SELECT s.*, i.name as item_name, st.name as staff_name
        FROM sales s
        JOIN inventory i ON s.item_id = i.id
        LEFT JOIN staff st ON s.staff_id = st.id
        ORDER BY s.sale_date DESC
    `;
    
    db.all(query, [], (err, sales) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', message: err.message });
        }
        res.json(sales);
    });
});

// Get sales summary
router.get('/summary', (req, res) => {
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
            return res.status(500).json({ error: 'Database error', message: err.message });
        }
        res.json(summary);
    });
});

// Get top selling items
router.get('/top-items', (req, res) => {
    const query = `
        SELECT 
            i.name as item_name,
            SUM(s.quantity) as total_quantity_sold,
            SUM(s.total_price) as total_revenue,
            COUNT(s.id) as number_of_sales
        FROM sales s
        JOIN inventory i ON s.item_id = i.id
        GROUP BY s.item_id
        ORDER BY total_quantity_sold DESC
        LIMIT 10
    `;
    
    db.all(query, [], (err, items) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', message: err.message });
        }
        res.json(items);
    });
});

// Get single sale
router.get('/:id', (req, res) => {
    const query = `
        SELECT s.*, i.name as item_name, st.name as staff_name
        FROM sales s
        JOIN inventory i ON s.item_id = i.id
        LEFT JOIN staff st ON s.staff_id = st.id
        WHERE s.id = ?
    `;
    
    db.get(query, [req.params.id], (err, sale) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', message: err.message });
        }
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        res.json(sale);
    });
});

// Add new sale
router.post('/', [
    body('item_id').isInt().withMessage('Item ID must be a number'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
    body('customer_name').notEmpty().withMessage('Customer name is required'),
    body('staff_id').optional().isInt().withMessage('Staff ID must be a number')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        item_id,
        quantity,
        unit_price,
        customer_name,
        customer_phone,
        staff_id,
        payment_method,
        notes
    } = req.body;

    const total_price = quantity * unit_price;

    // First check if item exists and has sufficient stock
    db.get('SELECT quantity FROM inventory WHERE id = ?', [item_id], (err, item) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', message: err.message });
        }
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        if (item.quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        // Insert sale record
        const saleQuery = `
            INSERT INTO sales (item_id, quantity, unit_price, total_price, customer_name, customer_phone, staff_id, payment_method, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(saleQuery, [item_id, quantity, unit_price, total_price, customer_name, customer_phone, staff_id, payment_method, notes], function(err) {
            if (err) {
                console.error('Sale insert error:', err);
                return res.status(500).json({ error: 'Failed to record sale', message: err.message, code: err.code, detail: err.detail });
            }
            // Capture the newly inserted sale ID from this callback context (sqlite) or adapter (postgres)
            const insertedSaleId = this && this.lastID !== undefined ? this.lastID : undefined;

            // Update inventory quantity
            const newQuantity = item.quantity - quantity;
            db.run('UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                [newQuantity, item_id], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update inventory', message: err.message });
                }

                res.status(201).json({ 
                    message: 'Sale recorded successfully',
                    saleId: insertedSaleId,
                    newQuantity
                });
            });
        });
    });
});

// Update sale
router.put('/:id', [
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be positive')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateFields = [];
    const values = [];

    Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
            updateFields.push(`${key} = ?`);
            values.push(req.body[key]);
        }
    });

    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    // Recalculate total_price if quantity or unit_price changed
    if (req.body.quantity || req.body.unit_price) {
        db.get('SELECT quantity, unit_price FROM sales WHERE id = ?', [id], (err, sale) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!sale) {
                return res.status(404).json({ error: 'Sale not found' });
            }

            const newQuantity = req.body.quantity || sale.quantity;
            const newUnitPrice = req.body.unit_price || sale.unit_price;
            const newTotalPrice = newQuantity * newUnitPrice;

            updateFields.push('total_price = ?');
            values.push(newTotalPrice);
            values.push(id);

            const query = `UPDATE sales SET ${updateFields.join(', ')} WHERE id = ?`;

            db.run(query, values, function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update sale' });
                }
                res.json({ message: 'Sale updated successfully' });
            });
        });
    } else {
        values.push(id);
        const query = `UPDATE sales SET ${updateFields.join(', ')} WHERE id = ?`;

        db.run(query, values, function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update sale' });
            }
            res.json({ message: 'Sale updated successfully' });
        });
    }
});

// Delete sale
router.delete('/:id', (req, res) => {
    // First get the sale details to restore inventory
    db.get('SELECT item_id, quantity FROM sales WHERE id = ?', [req.params.id], (err, sale) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Delete the sale
        db.run('DELETE FROM sales WHERE id = ?', [req.params.id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete sale' });
            }

            // Restore inventory quantity
            db.run('UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                [sale.quantity, sale.item_id], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to restore inventory' });
                }
                res.json({ message: 'Sale deleted successfully' });
            });
        });
    });
});

// Get sales by date range
router.get('/date-range/:start/:end', (req, res) => {
    const { start, end } = req.params;
    const query = `
        SELECT s.*, i.name as item_name, st.name as staff_name
        FROM sales s
        JOIN inventory i ON s.item_id = i.id
        LEFT JOIN staff st ON s.staff_id = st.id
        WHERE DATE(s.sale_date) BETWEEN ? AND ?
        ORDER BY s.sale_date DESC
    `;
    
    db.all(query, [start, end], (err, sales) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(sales);
    });
});

// Get sales by payment method
router.get('/by-payment/:method', (req, res) => {
    const query = `
        SELECT s.*, i.name as item_name, st.name as staff_name
        FROM sales s
        JOIN inventory i ON s.item_id = i.id
        LEFT JOIN staff st ON s.staff_id = st.id
        WHERE s.payment_method = ?
        ORDER BY s.sale_date DESC
    `;
    
    db.all(query, [req.params.method], (err, sales) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(sales);
    });
});

module.exports = router; 