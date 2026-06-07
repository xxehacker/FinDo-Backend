import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema(
  {
    emi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EMI",
      required: true,
    },
    installmentNo: {
      type: Number,
      required: true,
      min: 1,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "partial", "missed"],
      default: "pending",
    },
    linkedExpense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    note: {
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

// Indexes
installmentSchema.index({ emi: 1, dueDate: 1 });
installmentSchema.index({ emi: 1, status: 1 });

const Installment = mongoose.model("Installment", installmentSchema);
export default Installment;
