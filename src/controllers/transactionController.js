import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

// Add new transaction
export const addTransaction = async (req, res) => {
    try {
        const { type, amount, category, account, toAccount, division, description, date, tags } = req.body;
        const userId = req.user.id;

        // Validate account exists and belongs to user
        const accountDoc = await Account.findOne({ _id: account, user: userId, isActive: true });
        if (!accountDoc) {
            return res.status(404).json({ message: "Account not found" });
        }

        // For transfers, validate destination account
        if (type === "transfer") {
            const toAccountDoc = await Account.findOne({ _id: toAccount, user: userId, isActive: true });
            if (!toAccountDoc) {
                return res.status(404).json({ message: "Destination account not found" });
            }
            if (account === toAccount) {
                return res.status(400).json({ message: "Cannot transfer to the same account" });
            }
        }

        // For income/expense, validate category
        if (type !== "transfer") {
            const categoryDoc = await Category.findOne({ _id: category, user: userId, type, isActive: true });
            if (!categoryDoc) {
                return res.status(404).json({ message: "Category not found" });
            }
        }

        const transaction = new Transaction({
            user: userId,
            type,
            amount,
            category: type !== "transfer" ? category : undefined,
            account,
            toAccount: type === "transfer" ? toAccount : undefined,
            division,
            description,
            date: date || new Date(),
            tags: tags || []
        });

        await transaction.save();

        // Update account balances
        if (type === "income") {
            await Account.findByIdAndUpdate(account, { $inc: { balance: amount } });
        } else if (type === "expense") {
            await Account.findByIdAndUpdate(account, { $inc: { balance: -amount } });
        } else if (type === "transfer") {
            await Account.findByIdAndUpdate(account, { $inc: { balance: -amount } });
            await Account.findByIdAndUpdate(toAccount, { $inc: { balance: amount } });
        }

        const populatedTransaction = await Transaction.findById(transaction._id)
            .populate('category', 'name icon color')
            .populate('account', 'name type')
            .populate('toAccount', 'name type');

        res.status(201).json({
            message: "Transaction added successfully",
            transaction: populatedTransaction
        });
    } catch (error) {
        console.error("Add transaction error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get transactions with filters
export const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            type,
            division,
            category,
            account,
            startDate,
            endDate,
            page = 1,
            limit = 50,
            sortBy = "date",
            sortOrder = "desc"
        } = req.query;

        // Build filter object
        const filter = { user: userId };
        
        if (type) filter.type = type;
        if (division) filter.division = division;
        if (category) filter.category = category;
        if (account) filter.account = account;
        
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

        const transactions = await Transaction.find(filter)
            .populate('category', 'name icon color')
            .populate('account', 'name type')
            .populate('toAccount', 'name type')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(filter);

        res.json({
            transactions,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error("Get transactions error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update transaction (only within 12 hours)
export const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        const transaction = await Transaction.findOne({ _id: id, user: userId });
        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        // Check if transaction can be edited (within 12 hours)
        if (!transaction.canEdit) {
            return res.status(403).json({ message: "Transaction can only be edited within 12 hours of creation" });
        }

        // Revert previous balance changes
        const oldAmount = transaction.amount;
        if (transaction.type === "income") {
            await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: -oldAmount } });
        } else if (transaction.type === "expense") {
            await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: oldAmount } });
        } else if (transaction.type === "transfer") {
            await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: oldAmount } });
            await Account.findByIdAndUpdate(transaction.toAccount, { $inc: { balance: -oldAmount } });
        }

        // Update transaction
        Object.assign(transaction, updates);
        await transaction.save();

        // Apply new balance changes
        const newAmount = transaction.amount;
        if (transaction.type === "income") {
            await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: newAmount } });
        } else if (transaction.type === "expense") {
            await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: -newAmount } });
        } else if (transaction.type === "transfer") {
            await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: -newAmount } });
            await Account.findByIdAndUpdate(transaction.toAccount, { $inc: { balance: newAmount } });
        }

        const updatedTransaction = await Transaction.findById(id)
            .populate('category', 'name icon color')
            .populate('account', 'name type')
            .populate('toAccount', 'name type');

        res.json({
            message: "Transaction updated successfully",
            transaction: updatedTransaction
        });
    } catch (error) {
        console.error("Update transaction error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete transaction (only within 12 hours)
export const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const transaction = await Transaction.findOne({ _id: id, user: userId });
        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        // Check if transaction can be deleted (within 12 hours)
        if (!transaction.canEdit) {
            return res.status(403).json({ message: "Transaction can only be deleted within 12 hours of creation" });
        }

        // Revert balance changes
        if (transaction.type === "income") {
            await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: -transaction.amount } });
        } else if (transaction.type === "expense") {
            await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: transaction.amount } });
        } else if (transaction.type === "transfer") {
            await Account.findByIdAndUpdate(transaction.account, { $inc: { balance: transaction.amount } });
            await Account.findByIdAndUpdate(transaction.toAccount, { $inc: { balance: -transaction.amount } });
        }

        await Transaction.findByIdAndDelete(id);

        res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
        console.error("Delete transaction error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};