const db = require('./database/database');

console.log('=== DATABASE INSPECTION ===\n');

// Check uncategorized items
db.all(`
    SELECT COUNT(*) as count 
    FROM inventory 
    WHERE category_id IS NULL OR category_id = ''
`, [], (err, result) => {
    if (err) {
        console.error('Error checking uncategorized items:', err);
        return;
    }
    console.log('Uncategorized items:', result[0].count);
});

// Check all categories
db.all('SELECT * FROM categories ORDER BY name', [], (err, categories) => {
    if (err) {
        console.error('Error fetching categories:', err);
        return;
    }
    console.log('\n=== CATEGORIES ===');
    categories.forEach(cat => {
        console.log(`ID: ${cat.id}, Name: ${cat.name}`);
    });
});

// Check items with their categories
db.all(`
    SELECT i.id, i.name, i.category_id, c.name as category_name
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY i.name
`, [], (err, items) => {
    if (err) {
        console.error('Error fetching items:', err);
        return;
    }
    console.log('\n=== ITEMS AND THEIR CATEGORIES ===');
    items.forEach(item => {
        console.log(`${item.name} -> Category: ${item.category_name || 'N/A'} (ID: ${item.category_id || 'NULL'})`);
    });
});

// Check sales with item categories
db.all(`
    SELECT s.id, s.item_id, i.name as item_name, c.name as category_name
    FROM sales s
    JOIN inventory i ON s.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    LIMIT 10
`, [], (err, sales) => {
    if (err) {
        console.error('Error fetching sales:', err);
        return;
    }
    console.log('\n=== RECENT SALES WITH CATEGORIES ===');
    sales.forEach(sale => {
        console.log(`Sale ID: ${sale.id}, Item: ${sale.item_name}, Category: ${sale.category_name || 'N/A'}`);
    });
    
    // Close database connection after all queries
    setTimeout(() => {
        db.close();
        console.log('\n=== INSPECTION COMPLETE ===');
    }, 1000);
});
