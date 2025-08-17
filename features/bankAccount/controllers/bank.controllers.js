import { asyncHandler } from "@/../../utils/asyncHandler.js";
import Bank from "../models/bank.model.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";

//! Centralized error handling for Mongoose errors
const handleMongooseError = (error) => {
  if (error.name === "CastError") {
    return new ApiResponse(400, null, "Invalid ID format");
  }
  if (error.name === "ValidationError") {
    return new ApiResponse(
      400,
      null,
      Object.values(error.errors)
        .map((err) => err.message)
        .join(", ")
    );
  }
  return new ApiResponse(500, null, "Internal Server Error");
};

//! Get all bank accounts for the authenticated user
const handleGetBankAccounts = asyncHandler(async (req, res) => {
  try {
    const bankAccounts = await Bank.find({ user: req.user.id })
      .select("name ifsc branch accountNumber amount accountType accountUsedAs")
      .populate("user", "username email")
      .lean();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { bankAccounts },
          bankAccounts.length ? "Bank accounts found" : "No bank accounts found"
        )
      );
  } catch (error) {
    return res.status(error.status || 500).json(handleMongooseError(error));
  }
});

//! Get a specific bank account by ID
const handleGetBankAccountById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Bank account ID is required"));
    }

    const Bank = await Bank.findOne({
      _id: id,
      user: req.user.id,
    })
      .select("name ifsc branch accountNumber amount accountType accountUsedAs")
      .populate("user", "username  email")
      .lean();

    if (!Bank) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Bank account not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { Bank }, "Bank account found"));
  } catch (error) {
    return res.status(error.status || 500).json(handleMongooseError(error));
  }
});

//! Create a new bank account
const handleCreateBankAccount = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      ifsc,
      branch,
      accountNumber,
      amount,
      accountType,
      accountUsedAs,
    } = req.body;

    if (!name) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Bank account name is required"));
    }

    const Bank = await Bank.create({
      name,
      ifsc,
      branch,
      accountNumber,
      amount,
      accountType,
      accountUsedAs,
      user: req.user.id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, { Bank }, "Bank account created"));
  } catch (error) {
    return res.status(error.status || 500).json(handleMongooseError(error));
  }
});

//! Delete a bank account
const handleDeleteBankAccount = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Bank account ID is required"));
    }

    const Bank = await Bank.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!Bank) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Bank account not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, { Bank }, "Bank account deleted successfully")
      );
  } catch (error) {
    return res.status(error.status || 500).json(handleMongooseError(error));
  }
});

//! Edit a bank account
const handleEditBankAccount = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Bank account ID is required"));
    }

    const {
      name,
      ifsc,
      branch,
      accountNumber,
      amount,
      accountType,
      accountUsedAs,
    } = req.body;

    if (!name) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Bank account name is required"));
    }

    const Bank = await Bank.findOneAndUpdate(
      { _id: id, user: req.user.id },
      {
        $set: {
          name,
          ifsc,
          branch,
          accountNumber,
          amount,
          accountType,
          accountUsedAs,
        },
      },
      { new: true, runValidators: true }
    )
      .select("name ifsc branch accountNumber amount accountType accountUsedAs")
      .populate("user", "username email")
      .lean();

    if (!Bank) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Bank account not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { Bank }, "Bank account updated"));
  } catch (error) {
    return res.status(error.status || 500).json(handleMongooseError(error));
  }
});

export {
  handleGetBankAccounts,
  handleGetBankAccountById,
  handleCreateBankAccount,
  handleDeleteBankAccount,
  handleEditBankAccount,
};
