# Hardware Inventory Management System

A comprehensive inventory management system designed specifically for hardware stores, plumbing suppliers, and construction companies. This system helps you manage your stock, track sales, manage staff, and monitor budgets effectively.

## Features

### 🏪 **Inventory Management**
- Add, edit, and delete inventory items
- Track stock levels with automatic low-stock alerts
- Categorize items (Plumbing, Electrical, Tools, etc.)
- Search and filter inventory
- SKU management
- Supplier tracking
- Location management

### 💰 **Sales Tracking**
- Record sales transactions
- Customer information management
- Payment method tracking
- Staff performance tracking
- Sales history and analytics
- Automatic stock deduction on sales

### 👥 **Staff Management**
- Add and manage staff members
- Track staff performance
- Department and position management
- Salary tracking
- Staff status management (active/inactive)

### 📊 **Budget Management**
- Set monthly budgets by category
- Track expenses vs. budget
- Financial reporting
- Transaction history
- Budget vs. actual spending analysis

### 📈 **Reports & Analytics**
- Dashboard with key metrics
- Sales summaries
- Inventory reports
- Staff performance reports
- Low stock alerts
- Top selling items
- Financial summaries

### 🔐 **Security**
- User authentication
- Role-based access (Admin/Staff)
- Secure password handling
- JWT token authentication

## Installation

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Setup Instructions

1. **Clone or download the project**
   ```bash
   # If you have the files, navigate to the project directory
   cd hardware-inventory-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Access the system**
   - Open your web browser
   - Go to `http://localhost:3000`
   - Login with default credentials:
     - **Username:** `admin`
     - **Password:** `admin123`

## Default Setup

The system comes pre-configured with:

### Default Categories
- Plumbing Supplies
- Electrical Supplies
- Tools
- Fasteners
- Pipes & Fittings
- Valves
- Pumps
- Safety Equipment
- Other

### Default Admin User
- Username: `admin`
- Password: `admin123`
- Role: Admin

## Usage Guide

### 1. Getting Started
1. Login with the default admin credentials
2. Start by adding your inventory items
3. Add staff members
4. Set up budgets for different categories
5. Begin recording sales

### 2. Adding Inventory Items
1. Go to the **Inventory** section
2. Click **"Add Item"** button
3. Fill in the item details:
   - Name and description
   - Category selection
   - SKU (optional)
   - Initial quantity
   - Minimum quantity for alerts
   - Unit price
   - Supplier and location
4. Click **"Add Item"**

### 3. Recording Sales
1. Go to the **Sales** section
2. Click **"New Sale"** button
3. Select the item being sold
4. Enter quantity and price
5. Add customer information
6. Select payment method and staff member
7. Add any notes
8. Click **"Record Sale"**

### 4. Managing Staff
1. Go to the **Staff** section
2. Click **"Add Staff"** button
3. Fill in staff details:
   - Name, email, phone
   - Position and department
   - Hire date and salary
4. Click **"Add Staff Member"**

### 5. Budget Management
1. Go to the **Budget** section
2. Click **"Add Budget"** button
3. Set category, amount, and month/year
4. Monitor spending vs. budget

### 6. Reports & Analytics
1. Go to the **Reports** section
2. View various reports:
   - Inventory summary
   - Sales analytics
   - Staff performance
   - Financial reports

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Inventory
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Add new item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `GET /api/inventory/low-stock` - Get low stock items
- `GET /api/inventory/search/:term` - Search inventory

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Record new sale
- `GET /api/sales/summary` - Get sales summary
- `GET /api/sales/top-items` - Get top selling items

### Staff
- `GET /api/staff` - Get all staff
- `POST /api/staff` - Add new staff member
- `GET /api/staff/active` - Get active staff
- `GET /api/staff/:id/performance` - Get staff performance

### Budget
- `GET /api/budget` - Get all budgets
- `POST /api/budget` - Add new budget
- `GET /api/budget/summary` - Get budget summary
- `POST /api/budget/transaction` - Add transaction

### Reports
- `GET /api/reports/inventory-summary` - Inventory summary
- `GET /api/reports/sales-summary` - Sales summary
- `GET /api/reports/staff-performance` - Staff performance
- `GET /api/reports/low-stock-alert` - Low stock alerts

## Database Schema

The system uses SQLite with the following main tables:

- **users** - User authentication
- **staff** - Staff information
- **categories** - Item categories
- **inventory** - Inventory items
- **sales** - Sales transactions
- **budget** - Budget information
- **transactions** - Financial transactions

## Customization

### Adding New Categories
Categories are stored in the database and can be managed through the API or directly in the database.

### Modifying Default Settings
Edit the `database/database.js` file to modify:
- Default categories
- Default admin credentials
- Database structure

### Styling
Customize the appearance by modifying:
- `public/styles.css` - Main stylesheet
- Bootstrap classes in HTML files

## Security Considerations

1. **Change Default Password**: Change the default admin password immediately after first login
2. **Regular Backups**: Backup the SQLite database file regularly
3. **Network Security**: If deploying to production, ensure proper network security
4. **HTTPS**: Use HTTPS in production environments

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change port in server.js or use different port
   PORT=3001 npm start
   ```

2. **Database Issues**
   - Delete `database/hardware_inventory.db` to reset database
   - Restart the application

3. **Login Issues**
   - Check if the database is properly initialized
   - Verify default credentials: admin/admin123

4. **Module Not Found Errors**
   ```bash
   # Reinstall dependencies
   npm install
   ```

## Development

### Running in Development Mode
```bash
npm run dev
```

### File Structure
```
hardware-inventory-system/
├── database/
│   └── database.js          # Database setup and initialization
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── inventory.js        # Inventory management routes
│   ├── sales.js           # Sales tracking routes
│   ├── staff.js           # Staff management routes
│   ├── budget.js          # Budget management routes
│   └── reports.js         # Reports and analytics routes
├── public/
│   ├── index.html         # Main application interface
│   ├── styles.css         # Custom styles
│   └── app.js            # Frontend JavaScript
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the console for error messages
3. Verify all dependencies are installed
4. Ensure Node.js version is compatible

## License

This project is open source and available under the MIT License.

---

**Note**: This system is designed for small to medium-sized hardware businesses. For larger enterprises, consider additional features like multi-location support, advanced reporting, and integration with accounting software. 