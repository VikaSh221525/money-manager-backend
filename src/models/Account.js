import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: [true, "Account name is required"],
        trim: true,
        maxlength: [50, "Account name cannot exceed 50 characters"]
    },
    type: {
        type: String,
        enum: ["savings", "checking", "credit", "cash", "investment", "other"],
        required: true,
        default: "savings"
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, "Balance cannot be negative"]
    },
    currency: {
        type: String,
        default: "USD",
        maxlength: [3, "Currency code should be 3 characters"]
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for faster queries
accountSchema.index({ user: 1, isActive: 1 });

const Account = mongoose.model("Account", accountSchema);

export default Account;