const db = require('./database/database');

console.log('=== FIXING ITEM CATEGORY ASSIGNMENTS ===\n');

// Define category mappings based on item names and logical groupings
const categoryMappings = {
    // Tools (ID: 147)
    'Hammer': 147,
    'Pipe Wrench': 147,
    
    // Electrical Supplies (ID: 201)
    'Copper Wire 2.5mm': 201,
    
    // Pipes & Fittings (ID: 144) - already some correct
    'PVC Pipes 2inch': 144,
    'PVC Elbow 90°': 144,
    'pipe ranges': 144,
    // 'Cement 40kg': 144, // already correct
    // 'Test Item': 144, // already correct
    
    // Safety Equipment (ID: 152)
    'Safety Gloves': 152,
    'Safety Helmet': 152,
    'safety helmet': 152,
    
    // Plumbing Supplies (ID: 145)
    'cements': 145,
    'Cement 40kg': 145, // Move from Pipes & Fittings to Plumbing Supplies (more appropriate)
};

// First, let's get all items that need category updates
db.all(`
    SELECT i.id, i.name, i.category_id, c.name as current_category
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY i.name
`, [], (err, items) => {
    if (err) {
        console.error('Error fetching items:', err);
        return;
    }

    console.log('Current item categories:');
    items.forEach(item => {
        console.log(`${item.name} -> ${item.current_category || 'N/A'} (ID: ${item.category_id})`);
    });

    console.log('\n=== UPDATING CATEGORIES ===\n');

    // Update each item with correct category
    let updateCount = 0;
    const totalItems = items.length;

    items.forEach((item, index) => {
        let newCategoryId = item.category_id;
        
        // Check if item name matches our mapping
        if (categoryMappings[item.name]) {
            newCategoryId = categoryMappings[item.name];
        } else if (!item.current_category || item.current_category === 'N/A') {
            // If no specific mapping and currently uncategorized, assign to "Other"
            newCategoryId = 141; // Other category
        }

        // Only update if category has changed
        if (newCategoryId !== item.category_id) {
            db.run(
                'UPDATE inventory SET category_id = ? WHERE id = ?',
                [newCategoryId, item.id],
                function(err) {
                    if (err) {
                        console.error(`Error updating ${item.name}:`, err);
                    } else {
                        console.log(`✅ Updated ${item.name} -> Category ID: ${newCategoryId}`);
                        updateCount++;
                    }
                    
                    // Check if this is the last item
                    if (index === totalItems - 1) {
                        setTimeout(() => {
                            console.log(`\n=== UPDATE COMPLETE ===`);
                            console.log(`Updated ${updateCount} items with correct categories.`);
                            
                            // Verify the updates
                            console.log('\n=== VERIFICATION ===');
                            db.all(`
                                SELECT i.name, c.name as category_name
                                FROM inventory i
                                JOIN categories c ON i.category_id = c.id
                                ORDER BY c.name, i.name
                            `, [], (err, verifyItems) => {
                                if (err) {
                                    console.error('Error verifying updates:', err);
                                    return;
                                }
                                
                                console.log('\nAll items now properly categorized:');
                                let currentCategory = '';
                                verifyItems.forEach(item => {
                                    if (item.category_name !== currentCategory) {
                                        currentCategory = item.category_name;
                                        console.log(`\n📁 ${currentCategory}:`);
                                    }
                                    console.log(`  - ${item.name}`);
                                });
                                
                                db.close();
                                console.log('\n🎉 All items are now properly categorized!');
                                console.log('The "Top Selling Categories" chart should now display data.');
                            });
                        }, 500);
                    }
                }
            );
        } else {
            // If this is the last item and no updates needed
            if (index === totalItems - 1 && updateCount === 0) {
                console.log('No category updates needed.');
                db.close();
            }
        }
    });
});
