# 💰 Money Manager Backend API

A comprehensive RESTful API for personal and business financial management built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Complete Transaction Management** - Income, expenses, and transfers
- **Multi-Account Support** - Savings, checking, credit, cash accounts
- **Smart Categories** - Default categories with custom category creation
- **Office/Personal Division** - Separate business and personal expenses
- **Advanced Analytics** - Dashboard with trends and insights
- **12-Hour Edit Window** - Transaction editing restrictions for data integrity
- **JWT Authentication** - Secure user authentication with cookies
- **Real-time Balance Updates** - Automatic account balance calculations
- **Comprehensive Filtering** - Filter by date, category, division, account
- **Data Validation** - Input validation and error handling

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Built-in Mongoose validation
- **Security**: CORS, cookie-parser, input sanitization

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## ⚡ Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd money-manager-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/money-manager
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 4. Start the server
```bash
# Development mode with nodemon
npm run server

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📊 Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  profilePic: String
}
```

### Account
```javascript
{
  user: ObjectId,
  name: String,
  type: String, // savings, checking, credit, cash, investment, other
  balance: Number,
  currency: String,
  isActive: Boolean
}
```

### Category
```javascript
{
  user: ObjectId,
  name: String,
  type: String, // income, expense
  icon: String,
  color: String,
  isDefault: Boolean,
  isActive: Boolean
}
```

### Transaction
```javascript
{
  user: ObjectId,
  type: String, // income, expense, transfer
  amount: Number,
  category: ObjectId, // Not required for transfers
  account: ObjectId, // Source account
  toAccount: ObjectId, // Destination account (transfers only)
  division: String, // personal, office
  description: String,
  date: Date,
  isEditable: Boolean, // Auto-calculated based on 12-hour rule
  tags: [String]
}
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accounts` | Create new account |
| GET | `/api/accounts` | Get all user accounts |
| GET | `/api/accounts/:id` | Get account details |
| PUT | `/api/accounts/:id` | Update account |
| DELETE | `/api/accounts/:id` | Delete account |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/categories` | Create new category |
| GET | `/api/categories` | Get all categories |
| GET | `/api/categories/summary` | Get category analytics |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions` | Add new transaction |
| GET | `/api/transactions` | Get transactions (with filters) |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Get dashboard summary |
| GET | `/api/dashboard/trends` | Get income/expense trends |
| GET | `/api/dashboard/accounts` | Get accounts overview |

## 📝 API Usage Examples

### Add a Transaction
```javascript
POST /api/transactions
{
  "type": "expense",
  "amount": 50.00,
  "category": "category_id",
  "account": "account_id",
  "division": "personal",
  "description": "Lunch at restaurant",
  "date": "2024-01-15T12:00:00Z",
  "tags": ["food", "restaurant"]
}
```

### Get Dashboard Summary
```javascript
GET /api/dashboard/summary?period=monthly&division=personal

Response:
{
  "summary": {
    "income": { "total": 5000, "count": 2 },
    "expense": { "total": 2500, "count": 15 },
    "netIncome": 2500
  },
  "categoryBreakdown": [...]
}
```

### Filter Transactions
```javascript
GET /api/transactions?startDate=2024-01-01&endDate=2024-01-31&division=personal&type=expense
```

## 🔒 Authentication

All endpoints (except auth routes) require JWT authentication. The token can be sent via:
- **Cookie**: `token` (recommended)
- **Header**: `Authorization: Bearer <token>`

## 🎯 Key Features Explained

### Default Categories
When a user signs up, 19 default categories are automatically created:
- **Income**: Salary, Freelance, Investment, Business, Other Income
- **Expense**: Food, Fuel, Movie, Medical, Loan, Shopping, Transport, Utilities, Rent, Education, Entertainment, Travel, Insurance, Other Expense

### 12-Hour Edit Rule
- Transactions can only be edited/deleted within 12 hours of creation
- After 12 hours, transactions become read-only for data integrity
- The `isEditable` field automatically updates based on creation time

### Automatic Balance Updates
- Account balances update automatically when transactions are added/edited/deleted
- **Income**: Adds to account balance
- **Expense**: Subtracts from account balance
- **Transfer**: Subtracts from source account, adds to destination account

### Office/Personal Division
- Every transaction must be tagged as either "personal" or "office"
- Enables separate tracking of business and personal expenses
- Dashboard and reports can filter by division

## 🔍 Advanced Filtering

The API supports comprehensive filtering options:
- **Date Range**: `startDate` and `endDate`
- **Transaction Type**: `type` (income/expense/transfer)
- **Category**: `category` (category ID)
- **Account**: `account` (account ID)
- **Division**: `division` (personal/office)
- **Pagination**: `page` and `limit`
- **Sorting**: `sortBy` and `sortOrder`

## 📊 Analytics & Reports

### Dashboard Summary
- Period-wise income and expenditure (daily, weekly, monthly, yearly)
- Net income calculations
- Category-wise breakdown with percentages
- Transaction counts and averages

### Trends Analysis
- Historical income/expense trends
- Configurable time periods
- Data suitable for charts and graphs

### Category Analytics
- Spending analysis by category
- Percentage distributions
- Average, minimum, and maximum amounts per category

## 🛡️ Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure authentication with expiration
- **Input Validation**: Comprehensive data validation
- **User Isolation**: Users can only access their own data
- **CORS Protection**: Configured for frontend integration
- **SQL Injection Prevention**: MongoDB with Mongoose ODM

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/money-manager
JWT_SECRET=your-super-secure-production-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Docker Support (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run the test script to verify API functionality
node test-api.js
```

## 📁 Project Structure

```
├── src/
│   ├── controllers/     # Business logic
│   ├── models/         # Database schemas
│   ├── routes/         # API routes
│   ├── middleware/     # Authentication middleware
│   ├── utils/          # Utility functions
│   └── app.js          # Express app configuration
├── server.js           # Server entry point
├── test-api.js         # API testing script
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🆘 Support

If you encounter any issues or have questions:
1. Check the API documentation
2. Review the error messages in the console
3. Ensure all environment variables are set correctly
4. Verify MongoDB connection

## 🎉 Acknowledgments

Built for hackathon participants who need a robust financial management backend. This API provides all the necessary endpoints for building a comprehensive money manager application.

---

**Happy Coding! 💻✨**