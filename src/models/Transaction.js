import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["income", "expense", "transfer"],
        required: true
    },
    amount: {
        type: Number,
        required: [true, "Amount is required"],
        min: [0.01, "Amount must be greater than 0"]
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: function() {
            return this.type !== "transfer";
        }
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: true
    },
    // For transfers - destination account
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: function() {
            return this.type === "transfer";
        }
    },
    division: {
        type: String,
        enum: ["personal", "office"],
        required: true,
        default: "personal"
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, "Description cannot exceed 200 characters"]
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    // Track if transaction can be edited (within 12 hours)
    isEditable: {
        type: Boolean,
        default: true
    },
    // For recurring transactions
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringPattern: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
        required: function() {
            return this.isRecurring;
        }
    },
    // Tags for better organization
    tags: [{
        type: String,
        trim: true,
        maxlength: [20, "Tag cannot exceed 20 characters"]
    }],
    // Attachment support (receipts, bills)
    attachments: [{
        filename: String,
        url: String,
        size: Number
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });
transactionSchema.index({ user: 1, division: 1, date: -1 });
transactionSchema.index({ user: 1, account: 1, date: -1 });

// Pre-save middleware to check if transaction is still editable
transactionSchema.pre('save', function(next) {
    if (!this.isNew) {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        this.isEditable = this.createdAt > twelveHoursAgo;
    }
    next();
});

// Virtual for checking if transaction can be edited
transactionSchema.virtual('canEdit').get(function() {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return this.createdAt > twelveHoursAgo;
});

// Ensure virtual fields are serialized
transactionSchema.set('toJSON', { virtuals: true });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;