import { ApiResponse } from "@/../../utils/ApiResponse.js";
import { asyncHandler } from "@/../../utils/asyncHandler.js";
import Transaction from "../models/transaction.model.js";

const handleGetTransactions = asyncHandler(async (req, res) => {
  try {
    const userId = req?.user?.id;
    const transactions = await Transaction.find({ user: userId })
      .populate("dailyTransactions", "totalAmount")
      .populate("user", "username");
    // .populate("bankAccount", "name")
    // .populate("category", "name")

    if (!transactions) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, null, "There are no transactions for this user")
        );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { transactions }, "Transactions found"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, `Internal Server Error: ${error}`));
  }
});

const handleUpdateTransaction = asyncHandler(async (req, res) => {
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

  try {
    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id, //! Only update if the user is the owner
      },
      {
        $set: {
          type,
          amount,
          description,
          category,
          date,
          bankAccount: bankAccount || null,
          transactionMethod,
          transactionStatus,
          notes,
          timeOFDay,
        },
      },
      {
        new: true,
        runValidators: true, //! Run schema validators on update
      }
    );

    if (!transaction) {
      throw new Error(
        "Transaction not found or you are not authorized to update it"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, transaction, "Transaction updated successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, `Internal Server Error: ${error}`));
  }
});

const handleDeleteTransaction = asyncHandler(async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req?.user?.id,
    });

    if (!transaction) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Transaction not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Transaction deleted successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, `Internal Server Error: ${error}`));
  }
});

const handleGetTransactionById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Transaction ID is required"));
    }

    const userId = req?.user?.id;

    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "User ID is required"));
    }
    const transaction = await Transaction.findOne({
      _id: id,
      user: userId,
    });
    // .populate("bankAccount", "name")
    // .populate("category", "name")
    // .populate("user", "username");

    if (!transaction) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Transaction not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, transaction, "Transaction found"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, `Internal Server Error: ${error}`));
  }
});

const handleCreateTransaction = asyncHandler(async (req, res) => {
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

  try {
    const fields = { type, amount, category, date };
    const emptyField = Object.keys(fields).find(
      (key) => typeof fields[key] === "string" && fields[key].trim() === ""
    );

    if (emptyField) {
      throw new ApiError(400, `This field is required: ${emptyField}`);
    }

    const transaction = await Transaction.create({
      type,
      amount,
      description,
      category,
      date,
      bankAccount: bankAccount || null,
      transactionMethod,
      transactionStatus,
      notes,
      user: req?.user?.id,
      timeOFDay,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, { transaction }, "transaction created"));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          `${error.message}` || "Internal Server Error"
        )
      );
  }
});

//! Day wise transaction
const handleDayWiseTransaction = asyncHandler(async (req, res) => {
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
    totalAmount,
    timeOFDay,
  } = req.body;

  try {
    const fields = { type, amount, category, date, totalAmount };
    const emptyField = Object.keys(fields).find(
      (key) => typeof fields[key] === "string" && fields[key].trim() === ""
    );

    if (emptyField) {
      throw new ApiError(400, `This field is required: ${emptyField}`);
    }

    const transaction = await Transaction.create({
      type,
      amount,
      description: "Day Wise Transaction",
      category,
      date,
      bankAccount: bankAccount || null,
      transactionMethod,
      transactionStatus,
      notes,
      user: req?.user?.id,
      timeOFDay,
      dailyTransactions: [
        {
          totalAmount,
        },
      ],
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { transaction },
          "Day wise Transaction has created"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, `Internal Server Error: ${error}`));
  }
});

export {
  handleGetTransactions,
  handleCreateTransaction,
  handleUpdateTransaction,
  handleDeleteTransaction,
  handleGetTransactionById,
  handleDayWiseTransaction,
};
