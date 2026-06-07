import mongoose from "mongoose";

const emiSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    wishlistProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WishlistProduct",
      required: true,
    },
    provider: {
      type: String,
      enum: [
        "snapmint",
        "flipkart_pay_in_3",
        "flipkart_pay_later",
        "amazon_pay_later",
        "credit_card_emi",
        "bajaj_finserv",
        "other",
      ],
      required: true,
    },
    emiType: {
      type: String,
      enum: ["no_cost_emi", "interest_bearing", "bnpl_30_days"],
      default: "no_cost_emi",
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    downPayment: {
      type: Number,
      default: 0,
      min: 0,
    },
    financedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    installmentCount: {
      type: Number,
      required: true,
      min: 1,
    },
    installmentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    firstDueDate: {
      type: Date,
      required: true,
    },
    nextDueDate: {
      type: Date,
    },
    paidInstallments: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "completed", "defaulted"],
      default: "active",
    },
    autoExpense: {
      type: Boolean,
      default: true,
    },
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for fast lookups
emiSchema.index({ user: 1, status: 1 });
emiSchema.index({ wishlistProduct: 1 });

const EMI = mongoose.model("EMI", emiSchema);
export default EMI;
