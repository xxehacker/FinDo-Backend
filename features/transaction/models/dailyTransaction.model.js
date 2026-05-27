import mongoose from "mongoose";

const DayWiseTransactionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalIncome: {
      type: Number,
      default: 0,
    },
    totalExpense: {
      type: Number,
      default: 0,
    },
    transactions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    ],
  },
  { timestamps: true }
);

//! Compound index for efficient queries by user and date
DayWiseTransactionSchema.index({ user: 1, date: -1 });

const DayWiseTransaction = mongoose.model(
  "DayWiseTransaction",
  DayWiseTransactionSchema
);

export default DayWiseTransaction;
