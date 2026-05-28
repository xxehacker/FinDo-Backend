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
    attachment: attachment || "",
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
      attachment: attachment || "",
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
