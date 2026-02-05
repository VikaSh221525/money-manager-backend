import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";

// Create new account
export const createAccount = async (req, res) => {
    try {
        const { name, type, balance = 0, currency = "USD" } = req.body;
        const userId = req.user.id;

        const account = new Account({
            user: userId,
            name,
            type,
            balance,
            currency
        });

        await account.save();

        res.status(201).json({
            message: "Account created successfully",
            account
        });
    } catch (error) {
        console.error("Create account error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all user accounts
export const getAccounts = async (req, res) => {
    try {
        const userId = req.user.id;
        const { includeInactive = false } = req.query;

        const filter = { user: userId };
        if (!includeInactive) {
            filter.isActive = true;
        }

        const accounts = await Account.find(filter).sort({ createdAt: -1 });

        res.json({ accounts });
    } catch (error) {
        console.error("Get accounts error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update account
export const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        // Don't allow direct balance updates through this endpoint
        delete updates.balance;

        const account = await Account.findOneAndUpdate(
            { _id: id, user: userId },
            updates,
            { new: true, runValidators: true }
        );

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        res.json({
            message: "Account updated successfully",
            account
        });
    } catch (error) {
        console.error("Update account error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete account (soft delete)
export const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if account has transactions
        const transactionCount = await Transaction.countDocuments({
            user: userId,
            $or: [{ account: id }, { toAccount: id }]
        });

        if (transactionCount > 0) {
            // Soft delete - just mark as inactive
            const account = await Account.findOneAndUpdate(
                { _id: id, user: userId },
                { isActive: false },
                { new: true }
            );

            if (!account) {
                return res.status(404).json({ message: "Account not found" });
            }

            return res.json({
                message: "Account deactivated successfully (has transaction history)",
                account
            });
        } else {
            // Hard delete if no transactions
            const account = await Account.findOneAndDelete({ _id: id, user: userId });

            if (!account) {
                return res.status(404).json({ message: "Account not found" });
            }

            return res.json({ message: "Account deleted successfully" });
        }
    } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get account details with transaction history
export const getAccountDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;

        const account = await Account.findOne({ _id: id, user: userId });
        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        const skip = (page - 1) * limit;

        const transactions = await Transaction.find({
            user: userId,
            $or: [{ account: id }, { toAccount: id }]
        })
        .populate('category', 'name icon color')
        .populate('account', 'name type')
        .populate('toAccount', 'name type')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const totalTransactions = await Transaction.countDocuments({
            user: userId,
            $or: [{ account: id }, { toAccount: id }]
        });

        res.json({
            account,
            transactions,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(totalTransactions / limit),
                total: totalTransactions
            }
        });
    } catch (error) {
        console.error("Get account details error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};