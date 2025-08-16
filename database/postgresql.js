const { Pool } = require('pg');

// PostgreSQL connection setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize PostgreSQL tables
const initializeDatabase = async () => {
    const client = await pool.connect();
    try {
        // Create tables if they don't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'staff',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Ensure email is nullable if the table already existed with NOT NULL
        try {
            await client.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);
        } catch (e) {
            // ignore if already nullable or column state cannot be changed
        }

        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                category_id INTEGER REFERENCES categories(id),
                sku VARCHAR(100),
                quantity INTEGER DEFAULT 0,
                min_quantity INTEGER DEFAULT 0,
                unit_price DECIMAL(10,2) DEFAULT 0.00,
                supplier VARCHAR(200),
                location VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Backward compatibility: add/rename columns if an older schema exists
        try { await client.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS description TEXT`); } catch (e) {}
        try { await client.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sku VARCHAR(100)`); } catch (e) {}
        try { await client.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 0`); } catch (e) {}
        try { await client.query(`ALTER TABLE inventory RENAME COLUMN minimum_stock TO min_quantity`); } catch (e) {}

        await client.query(`
            CREATE TABLE IF NOT EXISTS staff (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE,
                phone VARCHAR(20),
                position VARCHAR(100),
                department VARCHAR(100),
                hire_date DATE,
                salary DECIMAL(10,2),
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS sales (
                id SERIAL PRIMARY KEY,
                item_id INTEGER REFERENCES inventory(id),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                customer_name VARCHAR(200),
                customer_phone VARCHAR(20),
                payment_method VARCHAR(50),
                staff_id INTEGER REFERENCES staff(id),
                notes TEXT,
                sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try { await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT`); } catch (e) {}

        await client.query(`
            CREATE TABLE IF NOT EXISTS budget (
                id SERIAL PRIMARY KEY,
                category VARCHAR(100) NOT NULL,
                allocated_amount DECIMAL(10,2) NOT NULL,
                spent_amount DECIMAL(10,2) DEFAULT 0.00,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(category, month, year)
            )
        `);

        console.log('✅ PostgreSQL database initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing PostgreSQL database:', error);
    } finally {
        client.release();
    }
};

// Helper: translate SQLite-style '?' placeholders to PostgreSQL $1, $2, ...
function mapPlaceholders(sql, params) {
    if (!params || params.length === 0) return { text: sql, values: params };
    let index = 0;
    const text = sql.replace(/\?/g, () => {
        index += 1;
        return `$${index}`;
    });
    return { text, values: params };
}

// SQLite-compatible adapter so existing routes keep working
function all(sql, params = [], cb) {
    const { text, values } = mapPlaceholders(sql, params);
    pool
        .query(text, values)
        .then(({ rows }) => cb && cb(null, rows))
        .catch(err => cb && cb(err));
}

function get(sql, params = [], cb) {
    const { text, values } = mapPlaceholders(sql, params);
    pool
        .query(text, values)
        .then(({ rows }) => cb && cb(null, rows && rows.length ? rows[0] : undefined))
        .catch(err => cb && cb(err));
}

function run(sql, params = [], cb) {
    let { text, values } = mapPlaceholders(sql, params);
    const upper = text.trim().toUpperCase();
    const isInsert = upper.startsWith('INSERT');
    const isUpdate = upper.startsWith('UPDATE');
    const isDelete = upper.startsWith('DELETE');

    // For INSERT statements, append RETURNING id if not already present to emulate sqlite lastID
    if (isInsert && !/RETURNING\s+\w+/i.test(text)) {
        text = `${text} RETURNING id`;
    }

    pool
        .query(text, values)
        .then(result => {
            const response = {
                rowCount: result.rowCount,
                changes: (isUpdate || isDelete) ? result.rowCount : result.rowCount
            };
            if (isInsert) {
                const first = result.rows && result.rows[0];
                if (first && (first.id !== undefined)) {
                    response.lastID = first.id;
                }
            }
            cb && cb(null, response);
        })
        .catch(err => cb && cb(err));
}

// Run initialization when module is required
initializeDatabase().catch(console.error);

module.exports = {
    // sqlite-like surface used by routes
    all,
    get,
    run,
    // direct access helpers
    pool,
    initializeDatabase,
    query: (text, params) => pool.query(text, params)
};
