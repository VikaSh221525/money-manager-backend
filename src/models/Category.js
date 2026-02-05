import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: [true, "Category name is required"],
        trim: true,
        maxlength: [30, "Category name cannot exceed 30 characters"]
    },
    type: {
        type: String,
        enum: ["income", "expense"],
        required: true
    },
    icon: {
        type: String,
        default: "💰"
    },
    color: {
        type: String,
        default: "#3B82F6"
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for faster queries
categorySchema.index({ user: 1, type: 1, isActive: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;