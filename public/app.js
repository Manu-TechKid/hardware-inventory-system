// Hardware Inventory Management System - Main Application

class HardwareInventorySystem {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentUser = JSON.parse(localStorage.getItem('user'));
        this.currentSection = 'dashboard';
        this.inventory = [];
        this.sales = [];
        this.staff = [];
        this.budgets = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.loadCategories();
    }

    setupEventListeners() {
        // Navigation (robust click handling within nav links)
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.closest('[data-section]');
                if (!target) return;
                this.showSection(target.getAttribute('data-section'));
            });
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Forms
        document.getElementById('addItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem();
        });

        document.getElementById('addSaleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSale();
        });

        document.getElementById('addStaffForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addStaff();
        });

        document.getElementById('addBudgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBudget();
        });

        // Setup forms
        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCategory();
        });

        document.getElementById('setupItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSetupItem();
        });

        document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        document.getElementById('changePasswordModalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePasswordModal();
        });

        // Edit forms
        document.getElementById('editItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateItem();
        });

        document.getElementById('editStaffForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateStaff();
        });

        document.getElementById('editBudgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateBudget();
        });

        document.getElementById('editCategoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateCategory();
        });

        document.getElementById('updateStockForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateStockQuantity();
        });

        // Auto-fill sale price when item is selected
        document.getElementById('saleItem').addEventListener('change', (e) => {
            this.updateSalePrice();
        });

        // Search and filters
        document.getElementById('searchInventory').addEventListener('input', (e) => {
            this.searchInventory(e.target.value);
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filterByCategory(e.target.value);
        });

        document.getElementById('showLowStock').addEventListener('click', () => {
            this.showLowStockItems();
        });

        // Auto-fill sale price when item is selected
        document.getElementById('saleItem').addEventListener('change', (e) => {
            this.updateSalePrice();
        });
    }

    checkAuth() {
        if (!this.token) {
            this.showLoginModal();
        } else {
            this.showApp();
            this.loadDashboard();
        }
    }

    showLoginModal() {
        document.getElementById('app').style.display = 'none';
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }

    showApp() {
        document.getElementById('app').style.display = 'block';
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                
                document.getElementById('currentUser').textContent = this.currentUser.username;
                
                this.showApp();
                this.loadDashboard();
                
                console.log('Login successful, app should be visible now');
            } else {
                this.showAlert(data.error, 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Login failed. Please try again.', 'danger');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.showLoginModal();
    }

    showSection(section) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(el => {
            el.style.display = 'none';
        });

        // Show selected section
        document.getElementById(`${section}-section`).style.display = 'block';

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        this.currentSection = section;

        // Load section data
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'sales':
                this.loadSales();
                break;
            case 'staff':
                this.loadStaff();
                break;
            case 'budget':
                this.loadBudget();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'setup':
                this.loadSetup();
                break;
        }
    }

    async loadDashboard() {
        try {
            console.log('Loading dashboard...');
            const [inventorySummary, salesSummary, staffSummary, recentSales, lowStock] = await Promise.all([
                this.fetchData('/api/reports/inventory-summary'),
                this.fetchData('/api/sales/summary'),
                this.fetchData('/api/staff/active'),
                this.fetchData('/api/sales'),
                this.fetchData('/api/inventory/low-stock')
            ]);

            // Compute total items with a fallback to inventory list length if needed
            let totalItemsCount = (inventorySummary && inventorySummary.total_items != null)
                ? Number(inventorySummary.total_items)
                : null;
            if (totalItemsCount == null || Number.isNaN(totalItemsCount)) {
                try {
                    const inventoryList = await this.fetchData('/api/inventory');
                    totalItemsCount = Array.isArray(inventoryList) ? inventoryList.length : 0;
                } catch (e) {
                    totalItemsCount = 0;
                }
            }

            // Update dashboard stats
            document.getElementById('totalItems').textContent = totalItemsCount;
            const totalRevenue = (salesSummary && salesSummary.total_revenue) ? Number(salesSummary.total_revenue) : 0;
            document.getElementById('totalSales').textContent = `KSH ${totalRevenue.toFixed(2)}`;
            const lowStockCount = (inventorySummary && inventorySummary.low_stock_items != null) ? Number(inventorySummary.low_stock_items) : 0;
            document.getElementById('lowStockItems').textContent = lowStockCount;
            document.getElementById('activeStaff').textContent = Array.isArray(staffSummary) ? staffSummary.length : 0;

            // Load recent sales
            this.displayRecentSales((recentSales || []).slice(0, 5));
            this.displayLowStockAlerts((lowStock || []).slice(0, 5));

            // Load charts
            this.loadDashboardCharts();

            console.log('Dashboard loaded successfully');

        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Set default values if API calls fail
            document.getElementById('totalItems').textContent = '0';
            document.getElementById('totalSales').textContent = 'KSH 0.00';
            document.getElementById('lowStockItems').textContent = '0';
            document.getElementById('activeStaff').textContent = '0';
        }
    }

    async loadInventory() {
        try {
            this.inventory = await this.fetchData('/api/inventory');
            this.displayInventory(this.inventory);
            this.loadCategories();
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    }

    async loadSales() {
        try {
            this.sales = await this.fetchData('/api/sales');
            this.displaySales(this.sales);
            this.loadStaffForSelect();
            this.loadInventoryForSelect();
        } catch (error) {
            console.error('Error loading sales:', error);
        }
    }

    async loadStaff() {
        try {
            this.staff = await this.fetchData('/api/staff');
            this.displayStaff(this.staff);
        } catch (error) {
            console.error('Error loading staff:', error);
        }
    }

    async loadBudget() {
        try {
            this.budgets = await this.fetchData('/api/budget');
            this.displayBudget(this.budgets);
            
            const summary = await this.fetchData('/api/budget/summary');
            this.displayBudgetSummary(summary);
        } catch (error) {
            console.error('Error loading budget:', error);
        }
    }

    async loadReports() {
        try {
            const [inventorySummary, salesSummary, topSellingItems] = await Promise.all([
                this.fetchData('/api/reports/inventory-summary'),
                this.fetchData('/api/sales/summary'),
                this.fetchData('/api/reports/top-selling-items')
            ]);

            this.displayInventorySummary(inventorySummary);
            this.displaySalesSummary(salesSummary);
            this.displayTopSellingItems(topSellingItems);

            // Load charts
            this.loadReportCharts();

        } catch (error) {
            console.error('Error loading reports:', error);
            // Set default values if API calls fail
            this.displayInventorySummary({ total_items: 0, total_value: 0, low_stock_items: 0 });
            this.displaySalesSummary({ total_sales: 0, total_revenue: 0, average_sale: 0 });
            this.displayTopSellingItems([]);
        }
    }

    async loadCategories() {
        try {
            const categories = await this.fetchData('/api/inventory/categories');
            const categorySelect = document.getElementById('itemCategory');
            const categoryFilter = document.getElementById('categoryFilter');
            const editCategorySelect = document.getElementById('editItemCategory');
            
            if (categorySelect) {
                categorySelect.innerHTML = '<option value="">Select Category</option>';
                categories.forEach(category => {
                    categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
                });
            }
            
            if (categoryFilter) {
                categoryFilter.innerHTML = '<option value="">All Categories</option>';
                categories.forEach(category => {
                    categoryFilter.innerHTML += `<option value="${category.id}">${category.name}</option>`;
                });
                // Reset to all categories by default and ensure table shows all
                categoryFilter.value = '';
                this.displayInventory(this.inventory);
            }

            if (editCategorySelect) {
                editCategorySelect.innerHTML = '<option value="">Select Category</option>';
                categories.forEach(category => {
                    editCategorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadStaffForSelect() {
        try {
            const staff = await this.fetchData('/api/staff/active');
            const staffSelect = document.getElementById('saleStaff');
            const itemSelect = document.getElementById('saleItem');
            
            if (staffSelect) {
                staffSelect.innerHTML = '<option value="">Select Staff</option>';
                staff.forEach(member => {
                    staffSelect.innerHTML += `<option value="${member.id}">${member.name}</option>`;
                });
            }

            // Load items for sale - only items with stock > 0
            const inventory = await this.fetchData('/api/inventory');
            if (itemSelect) {
                itemSelect.innerHTML = '<option value="">Select Item</option>';
                inventory.forEach(item => {
                    if ((item.quantity || 0) > 0) {
                        itemSelect.innerHTML += `<option value="${item.id}" data-price="${item.unit_price}">${item.name} (${item.quantity} in stock)</option>`;
                    }
                });
            }
        } catch (error) {
            console.error('Error loading staff/items for select:', error);
        }
    }

    async loadInventoryForSelect() {
        try {
            const itemSelect = document.getElementById('saleItem');
            if (!itemSelect) return;

            // Prefer cached inventory if available; otherwise fetch fresh
            const inventory = (this.inventory && Array.isArray(this.inventory) && this.inventory.length)
                ? this.inventory
                : await this.fetchData('/api/inventory');

            itemSelect.innerHTML = '<option value="">Select Item</option>';
            inventory.forEach(item => {
                if ((item.quantity || 0) > 0) {
                    itemSelect.innerHTML += `<option value="${item.id}" data-price="${item.unit_price}">${item.name} (${item.quantity} in stock)</option>`;
                }
            });
        } catch (error) {
            console.error('Error loading inventory for select:', error);
        }
    }

    // Display functions
    displayInventory(inventory) {
        const tbody = document.getElementById('inventoryTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        inventory.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category_name || 'N/A'}</td>
                <td>${item.sku || 'N/A'}</td>
                <td>
                    <span class="badge ${item.quantity <= item.min_quantity ? 'badge-danger' : 'badge-success'}">
                        ${item.quantity}
                    </span>
                </td>
                <td>KSH ${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                <td>KSH ${(item.quantity * (item.unit_price || 0)).toFixed(2)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="app.editItem(${item.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-warning btn-sm" onclick="app.updateStock(${item.id})">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="app.deleteItem(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    displaySales(sales) {
        const tbody = document.getElementById('salesTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        sales.forEach(sale => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(sale.sale_date).toLocaleDateString()}</td>
                <td>${sale.item_name}</td>
                <td>${sale.customer_name}</td>
                <td>${sale.quantity}</td>
                <td>KSH ${parseFloat(sale.total_price).toFixed(2)}</td>
                <td>${sale.staff_name || 'N/A'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="app.viewSale(${sale.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="app.deleteSale(${sale.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    displayStaff(staff) {
        const tbody = document.getElementById('staffTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        staff.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${member.name}</td>
                <td>${member.position || 'N/A'}</td>
                <td>${member.department || 'N/A'}</td>
                <td>${member.email || 'N/A'}</td>
                <td>${member.phone || 'N/A'}</td>
                <td>
                    <span class="badge ${member.status === 'active' ? 'badge-success' : 'badge-warning'}">
                        ${member.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="app.editStaff(${member.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="app.viewPerformance(${member.id})">
                            <i class="fas fa-chart-line"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="app.deleteStaff(${member.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    displayBudget(budgets) {
        const tbody = document.getElementById('budgetTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        budgets.forEach(budget => {
            const remaining = budget.amount - budget.spent;
            const percentage = (budget.spent / budget.amount) * 100;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${budget.category}</td>
                <td>KSH ${parseFloat(budget.amount).toFixed(2)}</td>
                <td>KSH ${parseFloat(budget.spent).toFixed(2)}</td>
                <td>
                    <span class="badge ${remaining >= 0 ? 'badge-success' : 'badge-danger'}">
                        KSH ${remaining.toFixed(2)}
                    </span>
                </td>
                <td>${budget.month_year}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="app.editBudget(${budget.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="app.deleteBudget(${budget.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    displayBudgetSummary(summary) {
        const container = document.getElementById('budgetSummary');
        if (!container) return;
        
        container.innerHTML = `
            <div class="mb-3">
                <strong>Total Budget:</strong> KSH ${parseFloat(summary.total_budget || 0).toFixed(2)}
            </div>
            <div class="mb-3">
                <strong>Total Spent:</strong> KSH ${parseFloat(summary.total_spent || 0).toFixed(2)}
            </div>
            <div class="mb-3">
                <strong>Remaining:</strong> 
                <span class="badge ${(summary.remaining_budget || 0) >= 0 ? 'badge-success' : 'badge-danger'}">
                    KSH ${parseFloat(summary.remaining_budget || 0).toFixed(2)}
                </span>
            </div>
            <div class="progress">
                <div class="progress-bar ${(summary.total_spent / summary.total_budget * 100) > 80 ? 'bg-danger' : 'bg-success'}" 
                     style="width: ${Math.min((summary.total_spent / summary.total_budget * 100), 100)}%">
                </div>
            </div>
        `;
    }

    displayRecentSales(sales) {
        const container = document.getElementById('recentSales');
        if (!container) return;
        
        container.innerHTML = '';

        sales.forEach(sale => {
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center mb-2';
            div.innerHTML = `
                <div>
                    <strong>${sale.item_name}</strong><br>
                    <small class="text-muted">${sale.customer_name} - ${new Date(sale.sale_date).toLocaleDateString()}</small>
                </div>
                <div class="text-end">
                    <strong>KSH ${parseFloat(sale.total_price).toFixed(2)}</strong><br>
                    <small class="text-muted">Qty: ${sale.quantity}</small>
                </div>
            `;
            container.appendChild(div);
        });
    }

    displayLowStockAlerts(items) {
        const container = document.getElementById('lowStockAlerts');
        if (!container) return;
        
        container.innerHTML = '';

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center mb-2';
            div.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    <small class="text-muted">${item.category_name}</small>
                </div>
                <div class="text-end">
                    <span class="badge badge-danger">${item.quantity} left</span><br>
                    <small class="text-muted">Min: ${item.min_quantity}</small>
                </div>
            `;
            container.appendChild(div);
        });
    }

    displayInventorySummary(summary) {
        const container = document.getElementById('inventorySummary');
        if (!container) return;
        
        container.innerHTML = `
            <div class="mb-3">
                <strong>Total Items:</strong> ${summary.total_items || 0}
            </div>
            <div class="mb-3">
                <strong>Total Stock:</strong> ${summary.total_stock || 0}
            </div>
            <div class="mb-3">
                <strong>Total Value:</strong> KSH ${parseFloat(summary.total_value || 0).toFixed(2)}
            </div>
            <div class="mb-3">
                <strong>Low Stock Items:</strong> ${summary.low_stock_items || 0}
            </div>
        `;
    }

    displaySalesSummary(summary) {
        const container = document.getElementById('salesSummary');
        if (!container) return;
        
        container.innerHTML = `
            <div class="mb-3">
                <strong>Total Sales:</strong> ${summary.total_sales || 0}
            </div>
            <div class="mb-3">
                <strong>Total Revenue:</strong> KSH ${parseFloat(summary.total_revenue || 0).toFixed(2)}
            </div>
            <div class="mb-3">
                <strong>Items Sold:</strong> ${summary.total_items_sold || 0}
            </div>
            <div class="mb-3">
                <strong>Average Sale:</strong> KSH ${parseFloat(summary.average_sale_value || 0).toFixed(2)}
            </div>
        `;
    }

    displayTopSellingItems(items) {
        const container = document.getElementById('topSellingItems');
        if (!container) return;
        
        container.innerHTML = '';
        
        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center mb-2';
            div.innerHTML = `
                <div>
                    <strong>${index + 1}. ${item.item_name}</strong><br>
                    <small class="text-muted">${item.number_of_sales} sales</small>
                </div>
                <div class="text-end">
                    <strong>${item.total_quantity_sold} sold</strong><br>
                    <small class="text-muted">KSH ${parseFloat(item.total_revenue).toFixed(2)}</small>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // CRUD Operations
    async addItem() {
        const formData = {
            name: document.getElementById('itemName').value,
            description: document.getElementById('itemDescription').value,
            category_id: document.getElementById('itemCategory').value,
            sku: document.getElementById('itemSKU').value,
            quantity: parseInt(document.getElementById('itemQuantity').value),
            min_quantity: parseInt(document.getElementById('itemMinQuantity').value) || 0,
            unit_price: parseFloat(document.getElementById('itemPrice').value),
            supplier: document.getElementById('itemSupplier').value,
            location: document.getElementById('itemLocation').value
        };

        try {
            const response = await this.fetchData('/api/inventory', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.id) {
                this.showAlert('Item added successfully!', 'success');
                document.getElementById('addItemForm').reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addItemModal'));
                modal.hide();
                this.loadInventory();
                if (this.currentSection === 'sales') {
                    await this.loadInventoryForSelect();
                }
            }
        } catch (error) {
            this.showAlert('Failed to add item. Please try again.', 'danger');
        }
    }

    async addSale() {
        const formData = {
            item_id: parseInt(document.getElementById('saleItem').value),
            quantity: parseInt(document.getElementById('saleQuantity').value),
            unit_price: parseFloat(document.getElementById('salePrice').value),
            customer_name: document.getElementById('customerName').value,
            customer_phone: document.getElementById('customerPhone').value,
            payment_method: document.getElementById('paymentMethod').value,
            staff_id: document.getElementById('saleStaff').value || null,
            notes: document.getElementById('saleNotes').value
        };

        try {
            const response = await this.fetchData('/api/sales', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.saleId) {
                this.showAlert('Sale recorded successfully!', 'success');
                document.getElementById('addSaleForm').reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addSaleModal'));
                modal.hide();
                this.loadSales();
                this.loadInventory(); // Refresh inventory to show updated stock
                this.loadDashboard();
            }
        } catch (error) {
            this.showAlert('Failed to record sale. Please try again.', 'danger');
        }
    }

    async addStaff() {
        const formData = {
            name: document.getElementById('staffName').value,
            email: document.getElementById('staffEmail').value,
            phone: document.getElementById('staffPhone').value,
            position: document.getElementById('staffPosition').value,
            department: document.getElementById('staffDepartment').value,
            hire_date: document.getElementById('staffHireDate').value,
            salary: parseFloat(document.getElementById('staffSalary').value) || null
        };

        try {
            const response = await this.fetchData('/api/staff', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.id) {
                this.showAlert('Staff member added successfully!', 'success');
                document.getElementById('addStaffForm').reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addStaffModal'));
                modal.hide();
                this.loadStaff();
            }
        } catch (error) {
            this.showAlert('Failed to add staff member. Please try again.', 'danger');
        }
    }

    async addBudget() {
        const formData = {
            category: document.getElementById('budgetCategory').value,
            amount: parseFloat(document.getElementById('budgetAmount').value),
            month_year: document.getElementById('budgetMonth').value
        };

        try {
            const response = await this.fetchData('/api/budget', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (response.id) {
                this.showAlert('Budget added successfully!', 'success');
                document.getElementById('addBudgetForm').reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addBudgetModal'));
                modal.hide();
                this.loadBudget();
            }
        } catch (error) {
            this.showAlert('Failed to add budget. Please try again.', 'danger');
        }
    }

    // Edit and Update Functions
    async editItem(id) {
        try {
            const item = await this.fetchData(`/api/inventory/${id}`);
            
            // Populate edit form
            document.getElementById('editItemId').value = item.id;
            document.getElementById('editItemName').value = item.name;
            document.getElementById('editItemDescription').value = item.description || '';
            document.getElementById('editItemCategory').value = item.category_id || '';
            document.getElementById('editItemSKU').value = item.sku || '';
            document.getElementById('editItemQuantity').value = item.quantity;
            document.getElementById('editItemMinQuantity').value = item.min_quantity || 0;
            document.getElementById('editItemPrice').value = item.unit_price;
            document.getElementById('editItemSupplier').value = item.supplier || '';
            document.getElementById('editItemLocation').value = item.location || '';

            // Load categories for edit form
            await this.loadCategories();

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editItemModal'));
            modal.show();
        } catch (error) {
            this.showAlert('Failed to load item details.', 'danger');
        }
    }

    async updateItem() {
        const id = document.getElementById('editItemId').value;
        const formData = {
            name: document.getElementById('editItemName').value,
            description: document.getElementById('editItemDescription').value,
            category_id: document.getElementById('editItemCategory').value,
            sku: document.getElementById('editItemSKU').value,
            quantity: parseInt(document.getElementById('editItemQuantity').value),
            min_quantity: parseInt(document.getElementById('editItemMinQuantity').value) || 0,
            unit_price: parseFloat(document.getElementById('editItemPrice').value),
            supplier: document.getElementById('editItemSupplier').value,
            location: document.getElementById('editItemLocation').value
        };

        try {
            const response = await this.fetchData(`/api/inventory/${id}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (response.message) {
                this.showAlert('Item updated successfully!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editItemModal'));
                modal.hide();
                this.loadInventory();
                if (this.currentSection === 'sales') {
                    await this.loadInventoryForSelect();
                }
            }
        } catch (error) {
            this.showAlert('Failed to update item. Please try again.', 'danger');
        }
    }

    async updateStock(id) {
        try {
            const item = await this.fetchData(`/api/inventory/${id}`);
            
            // Populate stock update form
            document.getElementById('updateStockItemId').value = item.id;
            document.getElementById('updateStockItemName').value = item.name;
            document.getElementById('updateStockCurrentQuantity').value = item.quantity;

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('updateStockModal'));
            modal.show();
        } catch (error) {
            this.showAlert('Failed to load item details.', 'danger');
        }
    }

    async updateStockQuantity() {
        const id = document.getElementById('updateStockItemId').value;
        const operation = document.getElementById('updateStockOperation').value;
        const quantity = parseInt(document.getElementById('updateStockQuantity').value);

        try {
            const response = await this.fetchData(`/api/inventory/${id}/stock`, {
                method: 'PATCH',
                body: JSON.stringify({ operation, quantity })
            });

            if (response.newQuantity !== undefined) {
                this.showAlert(`Stock updated successfully! New quantity: ${response.newQuantity}`, 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('updateStockModal'));
                modal.hide();
                this.loadInventory();
                if (this.currentSection === 'sales') {
                    await this.loadInventoryForSelect();
                }
            }
        } catch (error) {
            this.showAlert('Failed to update stock. Please try again.', 'danger');
        }
    }

    // Delete Functions
    async deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const response = await this.fetchData(`/api/inventory/${id}`, {
                method: 'DELETE'
            });

            if (response.message) {
                this.showAlert('Item deleted successfully!', 'success');
                this.loadInventory();
                if (this.currentSection === 'sales') {
                    await this.loadInventoryForSelect();
                }
            }
        } catch (error) {
            this.showAlert('Failed to delete item. Please try again.', 'danger');
        }
    }

    async deleteSale(id) {
        if (!confirm('Are you sure you want to delete this sale?')) return;

        try {
            const response = await this.fetchData(`/api/sales/${id}`, {
                method: 'DELETE'
            });

            if (response.message) {
                this.showAlert('Sale deleted successfully!', 'success');
                this.loadSales();
                this.loadDashboard();
            }
        } catch (error) {
            this.showAlert('Failed to delete sale. Please try again.', 'danger');
        }
    }

    async deleteStaff(id) {
        if (!confirm('Are you sure you want to delete this staff member?')) return;

        try {
            const response = await this.fetchData(`/api/staff/${id}`, {
                method: 'DELETE'
            });

            if (response.message) {
                this.showAlert('Staff member deleted successfully!', 'success');
                this.loadStaff();
            }
        } catch (error) {
            this.showAlert('Failed to delete staff member. Please try again.', 'danger');
        }
    }

    async deleteBudget(id) {
        if (!confirm('Are you sure you want to delete this budget?')) return;

        try {
            const response = await this.fetchData(`/api/budget/${id}`, {
                method: 'DELETE'
            });

            if (response.message) {
                this.showAlert('Budget deleted successfully!', 'success');
                this.loadBudget();
            }
        } catch (error) {
            this.showAlert('Failed to delete budget. Please try again.', 'danger');
        }
    }

    // View Functions
    async viewSale(id) {
        try {
            const sale = await this.fetchData(`/api/sales/${id}`);
            const details = `
                <strong>Sale Details:</strong><br>
                Item: ${sale.item_name}<br>
                Customer: ${sale.customer_name}<br>
                Quantity: ${sale.quantity}<br>
                                 Unit Price: KSH ${parseFloat(sale.unit_price).toFixed(2)}<br>
                 Total Price: KSH ${parseFloat(sale.total_price).toFixed(2)}<br>
                Date: ${new Date(sale.sale_date).toLocaleDateString()}<br>
                Staff: ${sale.staff_name || 'N/A'}<br>
                Payment Method: ${sale.payment_method}<br>
                Notes: ${sale.notes || 'N/A'}
            `;
            this.showAlert(details, 'info');
        } catch (error) {
            this.showAlert('Failed to load sale details.', 'danger');
        }
    }

    async viewPerformance(id) {
        try {
            const performance = await this.fetchData(`/api/staff/${id}/performance`);
            const details = `
                <strong>Performance Summary:</strong><br>
                Total Sales: ${performance.total_sales || 0}<br>
                Total Revenue: KSH ${parseFloat(performance.total_revenue || 0).toFixed(2)}<br>
                Average Sale: KSH ${parseFloat(performance.average_sale || 0).toFixed(2)}<br>
                Items Sold: ${performance.total_items_sold || 0}
            `;
            this.showAlert(details, 'info');
        } catch (error) {
            this.showAlert('Failed to load performance data.', 'danger');
        }
    }

    // Edit Functions
    async editStaff(id) {
        try {
            const staff = await this.fetchData(`/api/staff/${id}`);
            
            // Populate edit form
            document.getElementById('editStaffId').value = staff.id;
            document.getElementById('editStaffName').value = staff.name;
            document.getElementById('editStaffEmail').value = staff.email || '';
            document.getElementById('editStaffPhone').value = staff.phone || '';
            document.getElementById('editStaffPosition').value = staff.position || '';
            document.getElementById('editStaffDepartment').value = staff.department || '';
            document.getElementById('editStaffHireDate').value = staff.hire_date || '';
            document.getElementById('editStaffSalary').value = staff.salary || '';
            document.getElementById('editStaffStatus').value = staff.status || 'active';
            
            // Show edit modal
            const modal = new bootstrap.Modal(document.getElementById('editStaffModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading staff for edit:', error);
            this.showAlert('Failed to load staff details', 'error');
        }
    }

    async updateStaff() {
        try {
            const formData = {
                name: document.getElementById('editStaffName').value,
                email: document.getElementById('editStaffEmail').value,
                phone: document.getElementById('editStaffPhone').value,
                position: document.getElementById('editStaffPosition').value,
                department: document.getElementById('editStaffDepartment').value,
                hire_date: document.getElementById('editStaffHireDate').value,
                salary: parseFloat(document.getElementById('editStaffSalary').value) || null,
                status: document.getElementById('editStaffStatus').value
            };

            const staffId = document.getElementById('editStaffId').value;
            const response = await this.fetchData(`/api/staff/${staffId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (response.message) {
                this.showAlert('Staff updated successfully!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editStaffModal'));
                if (modal) modal.hide();
                this.loadStaff();
                this.loadDashboard();
            } else {
                this.showAlert(response.error || 'Failed to update staff', 'error');
            }
        } catch (error) {
            console.error('Error updating staff:', error);
            this.showAlert('Failed to update staff', 'error');
        }
    }

    async editBudget(id) {
        try {
            const budget = await this.fetchData(`/api/budget/${id}`);
            
            // Populate edit form
            document.getElementById('editBudgetId').value = budget.id;
            document.getElementById('editBudgetCategory').value = budget.category;
            document.getElementById('editBudgetAmount').value = budget.amount;
            document.getElementById('editBudgetMonth').value = budget.month_year;
            
            // Show edit modal
            const modal = new bootstrap.Modal(document.getElementById('editBudgetModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading budget for edit:', error);
            this.showAlert('Failed to load budget details', 'error');
        }
    }

    async updateBudget() {
        try {
            const formData = {
                category: document.getElementById('editBudgetCategory').value,
                amount: parseFloat(document.getElementById('editBudgetAmount').value),
                month_year: document.getElementById('editBudgetMonth').value
            };

            const budgetId = document.getElementById('editBudgetId').value;
            const response = await this.fetchData(`/api/budget/${budgetId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (response.success) {
                this.showAlert('Budget updated successfully!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editBudgetModal'));
                modal.hide();
                this.loadBudget();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error updating budget:', error);
            this.showAlert('Failed to update budget', 'error');
        }
    }

    // Utility functions
    async fetchData(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            ...options
        };

        const response = await fetch(url, config);
        
        if (!response.ok) {
            if (response.status === 401) {
                this.logout();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 500px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 8000);
    }

    searchInventory(term) {
        if (!term) {
            this.displayInventory(this.inventory);
            return;
        }

        const filtered = this.inventory.filter(item => 
            item.name.toLowerCase().includes(term.toLowerCase()) ||
            item.sku?.toLowerCase().includes(term.toLowerCase()) ||
            item.description?.toLowerCase().includes(term.toLowerCase())
        );

        this.displayInventory(filtered);
    }

    filterByCategory(categoryId) {
        if (!categoryId) {
            this.displayInventory(this.inventory);
            return;
        }

        const filtered = this.inventory.filter(item => item.category_id == categoryId);
        this.displayInventory(filtered);
    }

    async showLowStockItems() {
        try {
            const lowStock = await this.fetchData('/api/inventory/low-stock');
            this.displayInventory(lowStock);
            if (!lowStock || lowStock.length === 0) {
                this.showAlert('No low stock items at the moment.', 'info');
            }
        } catch (error) {
            console.error('Error loading low stock items:', error);
        }
    }

    updateSalePrice() {
        const itemSelect = document.getElementById('saleItem');
        const priceInput = document.getElementById('salePrice');
        
        if (itemSelect.value) {
            const selectedOption = itemSelect.options[itemSelect.selectedIndex];
            const price = selectedOption.getAttribute('data-price');
            if (price) {
                priceInput.value = price;
            }
        }
    }

    // Chart Functions
    async loadDashboardCharts() {
        try {
            const currentYear = new Date().getFullYear();
            const [monthlyData, categoryData] = await Promise.all([
                this.fetchData(`/api/reports/monthly-trend/${currentYear}`),
                this.fetchData('/api/reports/sales-by-category')
            ]);

            this.createMonthlySalesChart(monthlyData);
            this.createCategorySalesChart(categoryData);
        } catch (error) {
            console.error('Error loading dashboard charts:', error);
        }
    }

    async loadReportCharts() {
        try {
            const [dailyData, yearlyData, staffData] = await Promise.all([
                this.fetchData('/api/reports/daily-sales'),
                this.fetchData('/api/reports/yearly-revenue'),
                this.fetchData('/api/reports/staff-performance')
            ]);

            this.createDailySalesChart(dailyData);
            this.createYearlyRevenueChart(yearlyData);
            this.createStaffPerformanceChart(staffData);
        } catch (error) {
            console.error('Error loading report charts:', error);
        }
    }

    createMonthlySalesChart(data) {
        const ctx = document.getElementById('monthlySalesChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.month),
                datasets: [{
                    label: 'Monthly Sales (KSH)',
                    data: data.map(item => item.revenue),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Monthly Sales Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'KSH ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createCategorySalesChart(data) {
        const ctx = document.getElementById('categorySalesChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.category),
                datasets: [{
                    data: data.map(item => item.revenue),
                    backgroundColor: [
                        '#3498db',
                        '#e74c3c',
                        '#2ecc71',
                        '#f39c12',
                        '#9b59b6',
                        '#1abc9c'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    title: {
                        display: true,
                        text: 'Sales by Category'
                    }
                }
            }
        });
    }

    createDailySalesChart(data) {
        const ctx = document.getElementById('dailySalesChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Daily Sales (KSH)',
                    data: data.map(item => item.revenue),
                    backgroundColor: '#27ae60',
                    borderColor: '#229954',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Daily Sales Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'KSH ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createYearlyRevenueChart(data) {
        const ctx = document.getElementById('yearlyRevenueChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.year),
                datasets: [{
                    label: 'Yearly Revenue (KSH)',
                    data: data.map(item => item.revenue),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Yearly Revenue Growth'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'KSH ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createStaffPerformanceChart(data) {
        const ctx = document.getElementById('staffPerformanceChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.staff_name),
                datasets: [{
                    label: 'Sales Revenue (KSH)',
                    data: data.map(item => item.revenue),
                    backgroundColor: '#f39c12',
                    borderColor: '#e67e22',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Staff Performance'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'KSH ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    async loadSetup() {
        try {
            await Promise.all([
                this.loadCategoriesList(),
                this.loadSetupItemsList(),
                this.loadSetupCategories(),
                this.refreshSetupStats()
            ]);
        } catch (error) {
            console.error('Error loading setup:', error);
        }
    }

    async loadCategoriesList() {
        try {
            const categories = await this.fetchData('/api/inventory/categories');
            const container = document.getElementById('categoriesList');
            
            if (!container) return;
            
            if (categories.length === 0) {
                container.innerHTML = '<p class="text-muted">No categories found.</p>';
                return;
            }

            let html = '<div class="list-group">';
            categories.forEach(category => {
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${category.name}</strong>
                            ${category.description ? `<br><small class="text-muted">${category.description}</small>` : ''}
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-warning me-1" onclick="app.editCategory(${category.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.deleteCategory(${category.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading categories list:', error);
        }
    }

    async loadSetupItemsList() {
        try {
            const items = await this.fetchData('/api/inventory');
            const container = document.getElementById('setupItemsList');
            if (!container) return;

            if (items.length === 0) {
                container.innerHTML = '<p class="text-muted">No items found.</p>';
                return;
            }

            let html = '<div class="list-group">';
            items.forEach(item => {
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${item.name}</strong> (SKU: ${item.sku || 'N/A'})
                            <br><small class="text-muted">Category: ${item.category_name || 'N/A'}</small>
                            <br><small class="text-muted">Stock: ${item.quantity}</small>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-warning" onclick="app.editItem(${item.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.deleteItem(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading setup items list:', error);
        }
    }

    async loadSetupCategories() {
        try {
            const categories = await this.fetchData('/api/inventory/categories');
            const select = document.getElementById('setupItemCategory');
            if (select) {
                select.innerHTML = '<option value="">Select Category</option>';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading setup categories:', error);
        }
    }

    async refreshSetupStats() {
        try {
            const [inventory, categories, staff, sales] = await Promise.all([
                this.fetchData('/api/inventory'),
                this.fetchData('/api/inventory/categories'),
                this.fetchData('/api/staff'),
                this.fetchData('/api/sales')
            ]);

            document.getElementById('setupTotalItems').textContent = inventory.length || 0;
            document.getElementById('setupTotalCategories').textContent = categories.length || 0;
            document.getElementById('setupTotalStaff').textContent = staff.length || 0;
            document.getElementById('setupTotalSales').textContent = sales.length || 0;
        } catch (error) {
            console.error('Error refreshing setup stats:', error);
        }
    }

    async addCategory() {
        try {
            const name = document.getElementById('categoryName').value.trim();
            const description = document.getElementById('categoryDescription').value.trim();
            
            if (!name) {
                this.showAlert('Category name is required', 'error');
                return;
            }

            const response = await this.fetchData('/api/inventory/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ name, description })
            });

            if (response.success) {
                this.showAlert('Category added successfully', 'success');
                document.getElementById('categoryForm').reset();
                await this.loadCategoriesList();
                await this.loadCategories(); // Refresh dropdowns
                await this.refreshSetupStats(); // Refresh stats
                // Also refresh inventory if we're on that page
                if (this.currentSection === 'inventory') {
                    await this.loadInventory();
                }
            } else {
                this.showAlert(response.message || response.error || 'Failed to add category', 'error');
            }
        } catch (error) {
            console.error('Error adding category:', error);
            this.showAlert('Error adding category', 'error');
        }
    }

    async editCategory(id) {
        try {
            const category = await this.fetchData(`/api/inventory/categories/${id}`);
            document.getElementById('editCategoryId').value = category.id;
            document.getElementById('editCategoryName').value = category.name;
            document.getElementById('editCategoryDescription').value = category.description || '';

            const modal = new bootstrap.Modal(document.getElementById('editCategoryModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading category for edit:', error);
            this.showAlert('Failed to load category details', 'error');
        }
    }

    async updateCategory() {
        const id = document.getElementById('editCategoryId').value;
        const name = document.getElementById('editCategoryName').value.trim();
        const description = document.getElementById('editCategoryDescription').value.trim();

        if (!name) {
            this.showAlert('Category name is required', 'error');
            return;
        }

        try {
            const response = await this.fetchData(`/api/inventory/categories/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ name, description })
            });

            if (response.success) {
                this.showAlert('Category updated successfully', 'success');
                document.getElementById('editCategoryForm').reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('editCategoryModal'));
                if (modal) modal.hide();
                await this.loadCategoriesList();
                await this.loadCategories(); // Refresh dropdowns
                await this.refreshSetupStats(); // Refresh stats
            } else {
                this.showAlert(response.message || 'Failed to update category', 'error');
            }
        } catch (error) {
            console.error('Error updating category:', error);
            this.showAlert('Error updating category', 'error');
        }
    }

    async deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category?')) {
            return;
        }

        try {
            const response = await this.fetchData(`/api/inventory/categories/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.success) {
                this.showAlert('Category deleted successfully', 'success');
                await this.loadCategoriesList();
                await this.loadCategories(); // Refresh dropdowns
                await this.refreshSetupStats(); // Refresh stats
                // Also refresh inventory if we're on that page
                if (this.currentSection === 'inventory') {
                    await this.loadInventory();
                }
            } else {
                this.showAlert(response.message || response.error || 'Failed to delete category', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showAlert('Error deleting category', 'error');
        }
    }

    async addSetupItem() {
        try {
            const formData = {
                name: document.getElementById('setupItemName').value.trim(),
                category_id: document.getElementById('setupItemCategory').value,
                sku: document.getElementById('setupItemSKU').value.trim(),
                quantity: parseInt(document.getElementById('setupItemQuantity').value),
                min_quantity: parseInt(document.getElementById('setupItemMinQuantity').value) || 0,
                unit_price: parseFloat(document.getElementById('setupItemPrice').value),
                supplier: document.getElementById('setupItemSupplier').value.trim(),
                location: document.getElementById('setupItemLocation').value.trim()
            };

            if (!formData.name || !formData.category_id || !formData.unit_price || formData.quantity < 0) {
                this.showAlert('Please fill all required fields correctly', 'error');
                return;
            }

            const response = await this.fetchData('/api/inventory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.id) {
                this.showAlert('Item added successfully', 'success');
                document.getElementById('setupItemForm').reset();
                await this.loadSetupItemsList();
                await this.refreshSetupStats();
                // Also refresh inventory if we're on that page
                if (this.currentSection === 'inventory') {
                    await this.loadInventory();
                }
                // Refresh sales dropdown if we're on sales page
                if (this.currentSection === 'sales') {
                    await this.loadInventoryForSelect();
                }
            } else {
                this.showAlert('Failed to add item', 'error');
            }
        } catch (error) {
            console.error('Error adding setup item:', error);
            this.showAlert('Error adding item', 'error');
        }
    }

    async changePassword() {
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                this.showAlert('All fields are required', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                this.showAlert('New passwords do not match', 'error');
                return;
            }

            if (newPassword.length < 6) {
                this.showAlert('New password must be at least 6 characters', 'error');
                return;
            }

            const response = await this.fetchData('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.success) {
                this.showAlert('Password changed successfully', 'success');
                document.getElementById('changePasswordForm').reset();
            } else {
                this.showAlert(response.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showAlert('Error changing password', 'error');
        }
    }

    async changePasswordModal() {
        try {
            const currentPassword = document.getElementById('modalCurrentPassword').value;
            const newPassword = document.getElementById('modalNewPassword').value;
            const confirmPassword = document.getElementById('modalConfirmPassword').value;
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                this.showAlert('All fields are required', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                this.showAlert('New passwords do not match', 'error');
                return;
            }

            if (newPassword.length < 6) {
                this.showAlert('New password must be at least 6 characters', 'error');
                return;
            }

            const response = await this.fetchData('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.success) {
                this.showAlert('Password changed successfully', 'success');
                document.getElementById('changePasswordModalForm').reset();
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                if (modal) modal.hide();
            } else {
                this.showAlert(response.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showAlert('Error changing password', 'error');
        }
    }
}

// Initialize the application when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    app = new HardwareInventorySystem();
}); 