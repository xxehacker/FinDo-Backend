import mongoose from "mongoose";

const DayWiseTransactionSchema = new mongoose.Schema(
  {
    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: false }
);

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["income", "expense"],
    },
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: () => Date.now(),
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      default: null,
    },
    transactionMethod: {
      type: String,
      enum: [
        "cash",
        "googlepay",
        "phonepe",
        "paytm",
        "netbanking",
        "debitcard",
        "creditcard",
        "other",
      ],
      default: "googlepay",
    },
    transactionStatus: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // attachment: {
    //   type: String,
    //   trim: true,
    //   match: [/^https?:\/\/[^\s$.?#].[^\s]*$/, "Please provide a valid URL"],
    // },
    timeOFDay: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      default: "morning",
    },
    dailyTransactions: [DayWiseTransactionSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, category: 1 });
TransactionSchema.index({ user: 1, type: 1 });

// Virtual for formatted date
TransactionSchema.virtual("formattedDate").get(function () {
  return this.date.toISOString().split("T")[0]; // YYYY-MM-DD format
});

const Transaction = mongoose.model("Transaction", TransactionSchema);
export default Transaction;
