import mongoose from "mongoose";

const BankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  ifsc: {
    type: String,
    trim: true,
  },
  branch: {
    type: String,
    trim: true,
  },
  accountNumber: {
    type: String,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    default: 0,
    required: true,
  },
  accountType: {
    type: String,
    enum: ["primary", "secondary"],
    default: "primary",
    trim: true,
  },
  acountUsedAs: {
    type: String,
    enum: ["savings", "current"],
    default: "savings",
    trim: true,
  },
});

const Bank = mongoose.model("Bank", BankSchema);
export default Bank;
