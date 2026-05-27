// transaction.controllers.js
import mongoose from "mongoose";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import Transaction from "../models/transaction.model.js";
import DayWiseTransaction from "../models/dailyTransaction.model.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";

const updateDayWiseSummary = async (transaction, operation) => {
  try {
    const { user, date, type, amount, _id } = transaction;

    if (!mongoose.isValidObjectId(_id)) {
      throw new Error("Invalid transaction ID");
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    let dayWiseTransaction = await DayWiseTransaction.findOne({
      user,
      date: startOfDay,
    });

    if (operation === "create") {
      if (!dayWiseTransaction) {
        dayWiseTransaction = new DayWiseTransaction({
          user,
          date: startOfDay,
          totalIncome: type === "income" ? amount : 0,
          totalExpense: type === "expense" ? amount : 0,
          transactions: [_id],
        });
      } else {
        if (type === "income") {
          dayWiseTransaction.totalIncome += amount;
        } else if (type === "expense") {
          dayWiseTransaction.totalExpense += amount;
        }
        dayWiseTransaction.transactions.push(_id);
      }
    } else if (operation === "update") {
      if (!dayWiseTransaction) {
        throw new Error("DayWiseTransaction not found for update");
      }
      const transactions = await Transaction.find({
        _id: { $in: dayWiseTransaction.transactions },
      });
      dayWiseTransaction.totalIncome = transactions
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + tx.amount, 0);
      dayWiseTransaction.totalExpense = transactions
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);
    } else if (operation === "delete") {
      if (!dayWiseTransaction) {
        return;
      }
      dayWiseTransaction.transactions = dayWiseTransaction.transactions.filter(
        (txId) => txId.toString() !== _id.toString()
      );
      const transactions = await Transaction.find({
        _id: { $in: dayWiseTransaction.transactions },
      });
      dayWiseTransaction.totalIncome = transactions
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + tx.amount, 0);
      dayWiseTransaction.totalExpense = transactions
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);
      if (dayWiseTransaction.transactions.length === 0) {
        await DayWiseTransaction.deleteOne({ _id: dayWiseTransaction._id });
        return;
      }
    } else {
      throw new Error("Invalid operation type");
    }

    await dayWiseTransaction.save();
  } catch (error) {
    console.error("Error updating DayWiseTransaction:", error);
    throw error;
  }
};

export const handleCreateTransaction = asyncHandler(async (req, res) => {
  const {
    type,
    amount,
    description,
    category,
    date,
    bankAccount,
    transactionMethod,
    transactionStatus,
    notes,
    timeOFDay,
  } = req.body;

  if (!type || !amount || !description || !category || !date) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "All required fields must be provided"));
  }

  const transaction = await Transaction.create({
    type,
    amount,
    description,
    category,
    date,
    bankAccount,
    transactionMethod,
    transactionStatus,
    notes,
    timeOFDay,
    user: req.user.id,
  });

  await updateDayWiseSummary(transaction, "create");

  return res
    .status(201)
    .json(
      new ApiResponse(201, transaction, "Transaction created successfully")
    );
});

export const handleUpdateTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    type,
    amount,
    description,
    category,
    date,
    bankAccount,
    transactionMethod,
    transactionStatus,
    notes,
    timeOFDay,
  } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid transaction ID"));
  }

  if (!type || !amount || !description || !category || !date) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "All required fields must be provided"));
  }

  const transaction = await Transaction.findOneAndUpdate(
    { _id: id, user: req.user.id },
    {
      type,
      amount,
      description,
      category,
      date,
      bankAccount,
      transactionMethod,
      transactionStatus,
      notes,
      timeOFDay,
    },
    { new: true }
  );

  if (!transaction) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, null, "Transaction not found or access denied")
      );
  }

  await updateDayWiseSummary(transaction, "update");

  return res
    .status(200)
    .json(
      new ApiResponse(200, transaction, "Transaction updated successfully")
    );
});

export const handleDeleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid transaction ID"));
  }

  const transaction = await Transaction.findOne({ _id: id, user: req.user.id });
  if (!transaction) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, null, "Transaction not found or access denied")
      );
  }

  await Transaction.deleteOne({ _id: id });
  await updateDayWiseSummary(transaction, "delete");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Transaction deleted successfully"));
});

export const handleGetTransactionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid transaction ID"));
  }

  const transaction = await Transaction.findOne({
    _id: id,
    user: req.user.id,
  }).populate("category bankAccount");
  if (!transaction) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Transaction not found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, transaction, "Transaction fetched successfully")
    );
});

export const handleGetTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ user: req.user.id })
    .populate("category bankAccount")
    .sort({ date: -1 });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { transactions },
        "Transactions fetched successfully"
      )
    );
});

export const handleGetDayWiseSummary = asyncHandler(async (req, res) => {
  try {
    const summaries = await DayWiseTransaction.find({ user: req.user.id })
      .populate({
        path: "transactions",
        populate: [
          { path: "category", select: "name type" },
          { path: "bankAccount", select: "name accountNumber" },
        ],
      })
      .sort({ date: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          summaries,
          "Day-wise summaries fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error in handleGetDayWiseSummary:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, [], "Failed to fetch day-wise summaries"));
  }
});

export default updateDayWiseSummary;
