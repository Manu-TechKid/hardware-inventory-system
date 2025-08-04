const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');

const router = express.Router();

// Get all budgets
router.get('/', (req, res) => {
    const query = 'SELECT * FROM budget ORDER BY month_year DESC, category';
    
    db.all(query, [], (err, budgets) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(budgets);
    });
});

// Get single budget
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM budget WHERE id = ?', [req.params.id], (err, budget) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }
        res.json(budget);
    });
});

// Add new budget
router.post('/', [
    body('category').notEmpty().withMessage('Category is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('month_year').notEmpty().withMessage('Month/Year is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { category, amount, month_year, spent = 0 } = req.body;

    const query = 'INSERT INTO budget (category, amount, spent, month_year) VALUES (?, ?, ?, ?)';

    db.run(query, [category, amount, spent, month_year], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add budget' });
        }
        res.status(201).json({ 
            message: 'Budget added successfully',
            id: this.lastID 
        });
    });
});

// Update budget
router.put('/:id', [
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('spent').optional().isFloat({ min: 0 }).withMessage('Spent amount must be positive')
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

    const query = `UPDATE budget SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(query, values, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update budget' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }
        res.json({ message: 'Budget updated successfully' });
    });
});

// Delete budget
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM budget WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete budget' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }
        res.json({ message: 'Budget deleted successfully' });
    });
});

// Get budget by category
router.get('/category/:category', (req, res) => {
    const query = 'SELECT * FROM budget WHERE category = ? ORDER BY month_year DESC';
    
    db.all(query, [req.params.category], (err, budgets) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(budgets);
    });
});

// Get budget by month/year
router.get('/month/:monthYear', (req, res) => {
    const query = 'SELECT * FROM budget WHERE month_year = ? ORDER BY category';
    
    db.all(query, [req.params.monthYear], (err, budgets) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(budgets);
    });
});

// Get budget summary
router.get('/summary', (req, res) => {
    const query = `
        SELECT 
            SUM(amount) as total_budget,
            SUM(spent) as total_spent,
            SUM(amount - spent) as remaining_budget,
            COUNT(*) as total_categories
        FROM budget
    `;
    
    db.get(query, [], (err, summary) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(summary);
    });
});

// Add transaction
router.post('/transaction', [
    body('type').isIn(['expense', 'income']).withMessage('Type must be expense or income'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { type, amount, description, category, staff_id } = req.body;

    const query = 'INSERT INTO transactions (type, amount, description, category, staff_id) VALUES (?, ?, ?, ?, ?)';

    db.run(query, [type, amount, description, category, staff_id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add transaction' });
        }

        // If it's an expense, update the spent amount in budget
        if (type === 'expense') {
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
            db.run('UPDATE budget SET spent = spent + ? WHERE category = ? AND month_year = ?', 
                [amount, category, currentMonth], function(err) {
                if (err) {
                    console.error('Failed to update budget spent amount:', err);
                }
            });
        }

        res.status(201).json({ 
            message: 'Transaction added successfully',
            id: this.lastID 
        });
    });
});

// Get all transactions
router.get('/transactions', (req, res) => {
    const query = `
        SELECT t.*, s.name as staff_name
        FROM transactions t
        LEFT JOIN staff s ON t.staff_id = s.id
        ORDER BY t.date DESC
    `;
    
    db.all(query, [], (err, transactions) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(transactions);
    });
});

// Get transactions by type
router.get('/transactions/:type', (req, res) => {
    const query = `
        SELECT t.*, s.name as staff_name
        FROM transactions t
        LEFT JOIN staff s ON t.staff_id = s.id
        WHERE t.type = ?
        ORDER BY t.date DESC
    `;
    
    db.all(query, [req.params.type], (err, transactions) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(transactions);
    });
});

// Get transactions by category
router.get('/transactions/category/:category', (req, res) => {
    const query = `
        SELECT t.*, s.name as staff_name
        FROM transactions t
        LEFT JOIN staff s ON t.staff_id = s.id
        WHERE t.category = ?
        ORDER BY t.date DESC
    `;
    
    db.all(query, [req.params.category], (err, transactions) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(transactions);
    });
});

// Get budget vs actual spending
router.get('/vs-actual/:category', (req, res) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const query = `
        SELECT 
            b.amount as budget_amount,
            b.spent as actual_spent,
            (b.amount - b.spent) as remaining,
            (b.spent / b.amount * 100) as percentage_used
        FROM budget b
        WHERE b.category = ? AND b.month_year = ?
    `;
    
    db.get(query, [req.params.category, currentMonth], (err, comparison) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(comparison);
    });
});

module.exports = router; 