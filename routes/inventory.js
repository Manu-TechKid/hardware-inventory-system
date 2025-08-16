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

// Add new category
router.post('/categories', [
    body('name').notEmpty().withMessage('Category name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Category name must be between 2 and 50 characters')
        .trim()
        .escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;
    const trimmedName = name.trim();
    
    // First check if category already exists (case-insensitive)
    const checkQuery = 'SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(?)';
    
    db.get(checkQuery, [trimmedName], (err, existingCategory) => {
        if (err) {
            return res.status(500).json({ error: 'Database error while checking for duplicates' });
        }
        
        if (existingCategory) {
            return res.status(400).json({ 
                error: 'Category name already exists',
                message: `A category with the name "${trimmedName}" already exists.`
            });
        }
        
        // Insert new category
        const insertQuery = 'INSERT INTO categories (name, description) VALUES (?, ?)';
        
        db.run(insertQuery, [trimmedName, description?.trim() || null], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    return res.status(400).json({ 
                        error: 'Category name already exists',
                        message: `A category with the name "${trimmedName}" already exists.`
                    });
                }
                console.error('Error adding category:', err);
                return res.status(500).json({ error: 'Failed to add category' });
            }
            
            res.status(201).json({ 
                success: true,
                message: 'Category added successfully',
                id: this.lastID,
                category: {
                    id: this.lastID,
                    name: trimmedName,
                    description: description?.trim() || null
                }
            });
        });
    });
});

// Delete category
router.delete('/categories/:id', (req, res) => {
    const categoryId = req.params.id;
    
    // Check if category is being used by any inventory items
    db.get('SELECT COUNT(*) as count FROM inventory WHERE category_id = ?', [categoryId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (result.count > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Cannot delete category - it is being used by inventory items' 
            });
        }
        
        // Delete the category
        db.run('DELETE FROM categories WHERE id = ?', [categoryId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete category' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Category not found' });
            }
            res.json({ 
                success: true,
                message: 'Category deleted successfully' 
            });
        });
    });
});

// Get single category
router.get('/categories/:id', (req, res) => {
    const categoryId = req.params.id;
    
    db.get('SELECT * FROM categories WHERE id = ?', [categoryId], (err, category) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    });
});

// Update category
router.put('/categories/:id', [
    body('name').notEmpty().withMessage('Category name is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const categoryId = req.params.id;
    const { name, description } = req.body;
    
    db.run('UPDATE categories SET name = ?, description = ? WHERE id = ?', 
        [name, description, categoryId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update category' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ 
            success: true,
            message: 'Category updated successfully' 
        });
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
            return res.status(500).json({ error: 'Failed to add item', message: err.message });
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

// Get low stock items for dashboard
router.get('/low-stock', (req, res) => {
    const query = `
        SELECT 
            i.id,
            i.name,
            i.sku,
            i.quantity,
            i.min_quantity,
            c.name as category_name
        FROM inventory i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.quantity <= i.min_quantity AND i.min_quantity > 0
        ORDER BY (i.quantity - i.min_quantity) ASC
    `;
    
    db.all(query, [], (err, lowStockItems) => {
        if (err) {
            console.error('Low stock query error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(lowStockItems);
    });
});

module.exports = router;