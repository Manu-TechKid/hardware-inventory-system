const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');

const router = express.Router();

// Get all categories
router.get('/categories', (req, res) => {
    const query = 'SELECT * FROM categories ORDER BY name';
    
    db.all(query, [], (err, categories) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(categories);
    });
});

// Get all inventory items
router.get('/', (req, res) => {
    const query = `
        SELECT i.*, c.name as category_name 
        FROM inventory i 
        LEFT JOIN categories c ON i.category_id = c.id 
        ORDER BY i.name
    `;
    
    db.all(query, [], (err, items) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(items);
    });
});

// Get single inventory item
router.get('/:id', (req, res) => {
    const query = `
        SELECT i.*, c.name as category_name 
        FROM inventory i 
        LEFT JOIN categories c ON i.category_id = c.id 
        WHERE i.id = ?
    `;
    
    db.get(query, [req.params.id], (err, item) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(item);
    });
});

// Add new inventory item
router.post('/', [
    body('name').notEmpty().withMessage('Name is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive number'),
    body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('category_id').optional().isInt().withMessage('Category ID must be a number')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        name,
        description,
        category_id,
        sku,
        quantity,
        min_quantity,
        unit_price,
        supplier,
        location
    } = req.body;

    const query = `
        INSERT INTO inventory (name, description, category_id, sku, quantity, min_quantity, unit_price, supplier, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [name, description, category_id, sku, quantity, min_quantity, unit_price, supplier, location], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add item' });
        }
        res.status(201).json({ 
            message: 'Item added successfully',
            id: this.lastID 
        });
    });
});

// Update inventory item
router.put('/:id', [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a positive number'),
    body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a positive number')
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

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE inventory SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(query, values, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update item' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ message: 'Item updated successfully' });
    });
});

// Delete inventory item
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM inventory WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete item' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ message: 'Item deleted successfully' });
    });
});

// Update stock quantity
router.patch('/:id/stock', [
    body('quantity').isInt().withMessage('Quantity must be a number'),
    body('operation').isIn(['add', 'subtract', 'set']).withMessage('Operation must be add, subtract, or set')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { quantity, operation } = req.body;

    // First get current quantity
    db.get('SELECT quantity FROM inventory WHERE id = ?', [id], (err, item) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        let newQuantity;
        switch (operation) {
            case 'add':
                newQuantity = item.quantity + quantity;
                break;
            case 'subtract':
                newQuantity = Math.max(0, item.quantity - quantity);
                break;
            case 'set':
                newQuantity = Math.max(0, quantity);
                break;
        }

        db.run('UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [newQuantity, id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update stock' });
            }
            res.json({ 
                message: 'Stock updated successfully',
                newQuantity 
            });
        });
    });
});

// Get low stock items
router.get('/low-stock', (req, res) => {
    const query = `
        SELECT i.*, c.name as category_name 
        FROM inventory i 
        LEFT JOIN categories c ON i.category_id = c.id 
        WHERE i.quantity <= i.min_quantity 
        ORDER BY i.quantity ASC
    `;
    
    db.all(query, [], (err, items) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(items);
    });
});

// Search inventory
router.get('/search/:term', (req, res) => {
    const searchTerm = `%${req.params.term}%`;
    const query = `
        SELECT i.*, c.name as category_name 
        FROM inventory i 
        LEFT JOIN categories c ON i.category_id = c.id 
        WHERE i.name LIKE ? OR i.description LIKE ? OR i.sku LIKE ?
        ORDER BY i.name
    `;
    
    db.all(query, [searchTerm, searchTerm, searchTerm], (err, items) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(items);
    });
});

module.exports = router; 