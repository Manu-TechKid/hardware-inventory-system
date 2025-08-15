const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');

const router = express.Router();

// Get all staff
router.get('/', (req, res) => {
    const query = 'SELECT * FROM staff ORDER BY name';
    
    db.all(query, [], (err, staff) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(staff);
    });
});

// Get active staff only
router.get('/active', (req, res) => {
    const query = 'SELECT * FROM staff WHERE status = "active" ORDER BY name';
    
    db.all(query, [], (err, staff) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(staff);
    });
});

// Get single staff member
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM staff WHERE id = ?', [req.params.id], (err, staff) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        res.json(staff);
    });
});

// Add new staff member
router.post('/', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
    body('position').optional().notEmpty().withMessage('Position cannot be empty'),
    body('department').optional().notEmpty().withMessage('Department cannot be empty'),
    body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        name,
        email,
        phone,
        position,
        department,
        hire_date,
        salary
    } = req.body;

    const query = `
        INSERT INTO staff (name, email, phone, position, department, hire_date, salary)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [name, email, phone, position, department, hire_date, salary], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add staff member' });
        }
        res.status(201).json({ 
            message: 'Staff member added successfully',
            id: this.lastID 
        });
    });
});

// Update staff member
router.put('/:id', [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number')
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

    values.push(id);

    const query = `UPDATE staff SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(query, values, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update staff member' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        res.json({ message: 'Staff member updated successfully' });
    });
});

// Delete staff member
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM staff WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete staff member' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        res.json({ message: 'Staff member deleted successfully' });
    });
});

// Get staff by department
router.get('/department/:department', (req, res) => {
    const query = 'SELECT * FROM staff WHERE department = ? ORDER BY name';
    
    db.all(query, [req.params.department], (err, staff) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(staff);
    });
});

// Get staff performance (sales by staff)
router.get('/:id/performance', (req, res) => {
    const query = `
        SELECT 
            s.sale_date,
            s.total_price,
            i.name as item_name,
            s.quantity,
            s.customer_name
        FROM sales s
        JOIN inventory i ON s.item_id = i.id
        WHERE s.staff_id = ?
        ORDER BY s.sale_date DESC
    `;
    
    db.all(query, [req.params.id], (err, sales) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Calculate total sales
        const totalSales = sales.reduce((sum, sale) => sum + sale.total_price, 0);
        const totalItems = sales.reduce((sum, sale) => sum + sale.quantity, 0);
        
        res.json({
            sales,
            summary: {
                totalSales,
                totalItems,
                totalTransactions: sales.length
            }
        });
    });
});

// Update staff status
router.patch('/:id/status', [
    body('status').isIn(['active', 'inactive', 'terminated']).withMessage('Invalid status')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    db.run('UPDATE staff SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update status' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        res.json({ message: 'Status updated successfully' });
    });
});

module.exports = router; 