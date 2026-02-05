import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import mongoose from "mongoose";

// Get dashboard summary data
export const getDashboardSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = "monthly", division, startDate, endDate } = req.query;

        let dateFilter = {};
        const now = new Date();

        // Set date range based on period
        switch (period) {
            case "daily":
                dateFilter = {
                    $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                    $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                };
                break;
            case "weekly":
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);
                dateFilter = { $gte: weekStart, $lt: weekEnd };
                break;
            case "monthly":
                dateFilter = {
                    $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                    $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
                };
                break;
            case "yearly":
                dateFilter = {
                    $gte: new Date(now.getFullYear(), 0, 1),
                    $lt: new Date(now.getFullYear() + 1, 0, 1)
                };
                break;
            case "custom":
                if (startDate && endDate) {
                    dateFilter = {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    };
                }
                break;
        }

        // Build match criteria
        const matchCriteria = {
            user: new mongoose.Types.ObjectId(userId),
            date: dateFilter
        };

        if (division) {
            matchCriteria.division = division;
        }

        // Aggregate income and expense data
        const summary = await Transaction.aggregate([
            { $match: matchCriteria },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format summary data
        const summaryData = {
            income: { total: 0, count: 0 },
            expense: { total: 0, count: 0 },
            transfer: { total: 0, count: 0 }
        };

        summary.forEach(item => {
            if (summaryData[item._id]) {
                summaryData[item._id] = {
                    total: item.total,
                    count: item.count
                };
            }
        });

        // Calculate net income
        const netIncome = summaryData.income.total - summaryData.expense.total;

        // Get category-wise breakdown
        const categoryBreakdown = await Transaction.aggregate([
            { 
                $match: { 
                    ...matchCriteria,
                    type: { $in: ["income", "expense"] }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
            {
                $group: {
                    _id: {
                        category: "$category",
                        type: "$type",
                        name: "$categoryInfo.name",
                        icon: "$categoryInfo.icon",
                        color: "$categoryInfo.color"
                    },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.json({
            period,
            dateRange: dateFilter,
            summary: {
                ...summaryData,
                netIncome
            },
            categoryBreakdown
        });
    } catch (error) {
        console.error("Dashboard summary error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get income/expense trends over time
export const getTrends = async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = "monthly", months = 12 } = req.query;

        let groupBy = {};
        let dateRange = {};

        const now = new Date();

        switch (period) {
            case "daily":
                // Last 30 days
                dateRange = {
                    $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                };
                groupBy = {
                    year: { $year: "$date" },
                    month: { $month: "$date" },
                    day: { $dayOfMonth: "$date" }
                };
                break;
            case "weekly":
                // Last 12 weeks
                dateRange = {
                    $gte: new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)
                };
                groupBy = {
                    year: { $year: "$date" },
                    week: { $week: "$date" }
                };
                break;
            case "monthly":
                // Last specified months
                dateRange = {
                    $gte: new Date(now.getFullYear(), now.getMonth() - parseInt(months), 1)
                };
                groupBy = {
                    year: { $year: "$date" },
                    month: { $month: "$date" }
                };
                break;
            case "yearly":
                // Last 5 years
                dateRange = {
                    $gte: new Date(now.getFullYear() - 5, 0, 1)
                };
                groupBy = {
                    year: { $year: "$date" }
                };
                break;
        }

        const trends = await Transaction.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: dateRange,
                    type: { $in: ["income", "expense"] }
                }
            },
            {
                $group: {
                    _id: {
                        ...groupBy,
                        type: "$type"
                    },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
        ]);

        res.json({ trends, period });
    } catch (error) {
        console.error("Trends error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get account balances and overview
export const getAccountsOverview = async (req, res) => {
    try {
        const userId = req.user.id;

        const accounts = await Account.find({ user: userId, isActive: true });
        
        const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

        // Get recent transactions for each account
        const accountsWithTransactions = await Promise.all(
            accounts.map(async (account) => {
                const recentTransactions = await Transaction.find({
                    user: userId,
                    $or: [{ account: account._id }, { toAccount: account._id }]
                })
                .populate('category', 'name icon color')
                .sort({ date: -1 })
                .limit(5);

                return {
                    ...account.toObject(),
                    recentTransactions
                };
            })
        );

        res.json({
            accounts: accountsWithTransactions,
            totalBalance,
            accountCount: accounts.length
        });
    } catch (error) {
        console.error("Accounts overview error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};