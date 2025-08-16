// Check if we should use PostgreSQL or SQLite
if (process.env.DATABASE_URL) {
    // Use PostgreSQL for production
    module.exports = require('./postgresql');
} else {
    // Use SQLite for local development
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');

    const dbPath = path.join(__dirname, 'hardware_inventory.db');
    const db = new sqlite3.Database(dbPath);

    // Initialize database tables
    const initializeDatabase = () => {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Users table for authentication
                db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'staff',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'staff',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Staff table
            db.run(`CREATE TABLE IF NOT EXISTS staff (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                position TEXT,
                department TEXT,
                hire_date DATE,
                salary DECIMAL(10,2),
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Categories table for hardware types
            db.run(`CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Inventory table
            db.run(`CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                category_id INTEGER,
                sku TEXT UNIQUE,
                quantity INTEGER DEFAULT 0,
                min_quantity INTEGER DEFAULT 0,
                unit_price DECIMAL(10,2),
                supplier TEXT,
                location TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )`);

            // Sales table
            db.run(`CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER,
                quantity INTEGER,
                unit_price DECIMAL(10,2),
                total_price DECIMAL(10,2),
                customer_name TEXT,
                customer_phone TEXT,
                staff_id INTEGER,
                sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                payment_method TEXT,
                notes TEXT,
                FOREIGN KEY (item_id) REFERENCES inventory (id),
                FOREIGN KEY (staff_id) REFERENCES staff (id)
            )`);

            // Budget table
            db.run(`CREATE TABLE IF NOT EXISTS budget (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT,
                amount DECIMAL(10,2),
                spent DECIMAL(10,2) DEFAULT 0,
                month_year TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Transactions table for all financial activities
            db.run(`CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                amount DECIMAL(10,2),
                description TEXT,
                category TEXT,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                staff_id INTEGER,
                FOREIGN KEY (staff_id) REFERENCES staff (id)
            )`);

            // Insert default categories
            const defaultCategories = [
                'Plumbing Supplies',
                'Electrical Supplies',
                'Tools',
                'Fasteners',
                'Pipes & Fittings',
                'Valves',
                'Pumps',
                'Safety Equipment',
                'Other'
            ];

            defaultCategories.forEach(category => {
                db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);
            });

            // Insert default admin user
            const bcrypt = require('bcryptjs');
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', 
                ['admin', hashedPassword, 'admin']);

            console.log('Database initialized successfully');
            resolve();
        });
    });
};

// Initialize the database
initializeDatabase().catch(console.error);

    module.exports = db;
} 