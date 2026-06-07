// transaction.controllers.js
import mongoose from "mongoose";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import Transaction from "../models/transaction.model.js";
import DayWiseTransaction from "../models/dailyTransaction.model.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { resolveTransactionTypeFromCategory } from "../../category/utils/resolveCategoryType.js";
import updateDayWiseSummary from "../utils/updateDayWiseSummary.js";
import { importSalaryHistory } from "../services/importSalaryHistory.js";
import { getSalaryScheduleSummary } from "../constants/salarySchedule.js";

export const handleCreateTransaction = asyncHandler(async (req, res) => {
  const {
    amount,
    description,
    category,
    date,
    bankAccount,
    transactionMethod,
    transactionStatus,
    notes,
    timeOFDay,
    attachment,
  } = req.body;

  if (!amount || !description || !category || !date) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "All required fields must be provided"));
  }

  const { type, error } = await resolveTransactionTypeFromCategory(
    category,
    req.user.id
  );
  if (error) {
    return res.status(400).json(new ApiResponse(400, null, error));
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
    isDayWise: isDayWise || false,
    attachment: attachment || "",
    user: req.user.id,
  });

  if (transaction.isDayWise) {
    await updateDayWiseSummary(transaction, "create");
  }

  await transaction.populate([
    { path: "category", select: "name type status" },
    { path: "bankAccount" }
  ]);

  return res
    .status(201)
    .json(
      new ApiResponse(201, transaction, "Transaction created successfully")
    );
});

export const handleUpdateTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    amount,
    description,
    category,
    date,
    bankAccount,
    transactionMethod,
    transactionStatus,
    notes,
    timeOFDay,
    isDayWise,
    attachment,
  } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid transaction ID"));
  }

  if (!amount || !description || !category || !date) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "All required fields must be provided"));
  }

  const { type, error } = await resolveTransactionTypeFromCategory(
    category,
    req.user.id
  );
  if (error) {
    return res.status(400).json(new ApiResponse(400, null, error));
  }

  const updateFields = {
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
    isDayWise,
    attachment: attachment || "",
  };

  const transaction = await Transaction.findOneAndUpdate(
    { _id: id, user: req.user.id },
    updateFields,
    { new: true }
  );

  if (!transaction) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, null, "Transaction not found or access denied")
      );
  }

  if (transaction.isDayWise) {
    await updateDayWiseSummary(transaction, "update");
  }

  await transaction.populate([
    { path: "category", select: "name type status" },
    { path: "bankAccount" }
  ]);

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
  }).populate("category", "name type status").populate("bankAccount");
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
    .populate("category", "name type status")
    .populate("bankAccount")
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

export const handleImportSalaryHistory = asyncHandler(async (req, res) => {
  const result = await importSalaryHistory(req.user._id);
  return res.status(200).json(
    new ApiResponse(200, result, "Salary history import completed")
  );
});

export const handleGetSalarySchedulePreview = asyncHandler(async (req, res) => {
  const schedule = getSalaryScheduleSummary();
  return res.status(200).json(
    new ApiResponse(200, { schedule }, "Salary schedule preview")
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

    // Merge duplicate dates in-memory to prevent layout issues from legacy database race conditions
    const mergedMap = new Map();
    for (const summary of summaries) {
      if (!summary.date) continue;
      const startOfDay = new Date(summary.date);
      startOfDay.setHours(0, 0, 0, 0);
      const dateKey = startOfDay.getTime();

      if (!mergedMap.has(dateKey)) {
        mergedMap.set(dateKey, {
          _id: summary._id,
          date: summary.date,
          user: summary.user,
          totalIncome: summary.totalIncome || 0,
          totalExpense: summary.totalExpense || 0,
          transactions: summary.transactions ? [...summary.transactions] : [],
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        });
      } else {
        const existing = mergedMap.get(dateKey);
        existing.totalIncome += summary.totalIncome || 0;
        existing.totalExpense += summary.totalExpense || 0;
        
        // Append unique transactions only
        if (summary.transactions) {
          const existingTxIds = new Set(existing.transactions.map((t) => String(t._id)));
          for (const tx of summary.transactions) {
            if (tx && !existingTxIds.has(String(tx._id))) {
              existing.transactions.push(tx);
            }
          }
        }
      }
    }

    const mergedSummaries = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          mergedSummaries,
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
