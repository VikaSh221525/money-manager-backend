import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";

// Create default categories for new users
export const createDefaultCategories = async (userId) => {
    const defaultCategories = [
        // Income categories
        { name: "Salary", type: "income", icon: "💰", color: "#10B981" },
        { name: "Freelance", type: "income", icon: "💻", color: "#059669" },
        { name: "Investment", type: "income", icon: "📈", color: "#047857" },
        { name: "Business", type: "income", icon: "🏢", color: "#065F46" },
        { name: "Other Income", type: "income", icon: "💵", color: "#064E3B" },

        // Expense categories
        { name: "Food", type: "expense", icon: "🍽️", color: "#EF4444" },
        { name: "Fuel", type: "expense", icon: "⛽", color: "#DC2626" },
        { name: "Movie", type: "expense", icon: "🎬", color: "#B91C1C" },
        { name: "Medical", type: "expense", icon: "🏥", color: "#991B1B" },
        { name: "Loan", type: "expense", icon: "🏦", color: "#7F1D1D" },
        { name: "Shopping", type: "expense", icon: "🛍️", color: "#F59E0B" },
        { name: "Transport", type: "expense", icon: "🚗", color: "#D97706" },
        { name: "Utilities", type: "expense", icon: "💡", color: "#B45309" },
        { name: "Rent", type: "expense", icon: "🏠", color: "#92400E" },
        { name: "Education", type: "expense", icon: "📚", color: "#78350F" },
        { name: "Entertainment", type: "expense", icon: "🎮", color: "#8B5CF6" },
        { name: "Travel", type: "expense", icon: "✈️", color: "#7C3AED" },
        { name: "Insurance", type: "expense", icon: "🛡️", color: "#6D28D9" },
        { name: "Other Expense", type: "expense", icon: "💸", color: "#5B21B6" }
    ];

    const categories = defaultCategories.map(cat => ({
        ...cat,
        user: userId,
        isDefault: true
    }));

    await Category.insertMany(categories);
    return categories;
};

// Create new category
export const createCategory = async (req, res) => {
    try {
        const { name, type, icon = "💰", color = "#3B82F6" } = req.body;
        const userId = req.user.id;

        // Check if category already exists
        const existingCategory = await Category.findOne({
            user: userId,
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            type,
            isActive: true
        });

        if (existingCategory) {
            return res.status(400).json({ message: "Category already exists" });
        }

        const category = new Category({
            user: userId,
            name,
            type,
            icon,
            color
        });

        await category.save();

        res.status(201).json({
            message: "Category created successfully",
            category
        });
    } catch (error) {
        console.error("Create category error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all user categories
export const getCategories = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, includeInactive = false } = req.query;

        const filter = { user: userId };
        if (type) filter.type = type;
        if (!includeInactive) filter.isActive = true;

        const categories = await Category.find(filter).sort({ name: 1 });

        // Group by type
        const groupedCategories = {
            income: categories.filter(cat => cat.type === "income"),
            expense: categories.filter(cat => cat.type === "expense")
        };

        res.json({ 
            categories: type ? categories : groupedCategories,
            total: categories.length
        });
    } catch (error) {
        console.error("Get categories error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update category
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        const category = await Category.findOneAndUpdate(
            { _id: id, user: userId, isDefault: false }, // Don't allow updating default categories
            updates,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: "Category not found or cannot be updated" });
        }

        res.json({
            message: "Category updated successfully",
            category
        });
    } catch (error) {
        console.error("Update category error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete category (soft delete)
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const category = await Category.findOne({ _id: id, user: userId });
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        if (category.isDefault) {
            return res.status(400).json({ message: "Cannot delete default category" });
        }

        // Check if category has transactions
        const transactionCount = await Transaction.countDocuments({
            user: userId,
            category: id
        });

        if (transactionCount > 0) {
            // Soft delete - just mark as inactive
            category.isActive = false;
            await category.save();

            return res.json({
                message: "Category deactivated successfully (has transaction history)",
                category
            });
        } else {
            // Hard delete if no transactions
            await Category.findByIdAndDelete(id);
            return res.json({ message: "Category deleted successfully" });
        }
    } catch (error) {
        console.error("Delete category error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get category summary with spending analysis
export const getCategorySummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, division } = req.query;

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.date = {};
            if (startDate) dateFilter.date.$gte = new Date(startDate);
            if (endDate) dateFilter.date.$lte = new Date(endDate);
        }

        const matchCriteria = {
            user: userId,
            ...dateFilter
        };

        if (division) {
            matchCriteria.division = division;
        }

        const categorySummary = await Transaction.aggregate([
            { $match: matchCriteria },
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
                    count: { $sum: 1 },
                    avgAmount: { $avg: "$amount" },
                    maxAmount: { $max: "$amount" },
                    minAmount: { $min: "$amount" }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // Calculate percentages
        const totalByType = {
            income: categorySummary.filter(cat => cat._id.type === "income").reduce((sum, cat) => sum + cat.total, 0),
            expense: categorySummary.filter(cat => cat._id.type === "expense").reduce((sum, cat) => sum + cat.total, 0)
        };

        const summaryWithPercentages = categorySummary.map(cat => ({
            ...cat,
            percentage: totalByType[cat._id.type] > 0 ? 
                ((cat.total / totalByType[cat._id.type]) * 100).toFixed(2) : 0
        }));

        res.json({
            categorySummary: summaryWithPercentages,
            totals: totalByType
        });
    } catch (error) {
        console.error("Category summary error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};