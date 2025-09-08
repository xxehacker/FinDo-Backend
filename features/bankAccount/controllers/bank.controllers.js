import { asyncHandler } from "@/../../utils/asyncHandler.js";
import Bank from "../models/bank.model.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";


//! Get all bank accounts for the authenticated user
const handleGetBankAccounts = asyncHandler(async (req, res) => {
  try {
    const bankAccounts = await Bank.find({ user: req.user.id })
      .select("name ifsc branch accountNumber amount accountType")
      .populate("user", "username email")
      .lean();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          bankAccounts,
          bankAccounts.length ? "Bank accounts found" : "No bank accounts found"
        )
      );
  } catch (error) {
    throw new ApiError(500, null, "Internal Server Error");
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

    const getbank = await Bank.findOne({
      _id: id,
      user: req.user.id,
    })
      .select("name ifsc branch accountNumber amount accountType")
      .populate("user", "username  email")
      .lean();

    if (!getbank) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Bank account not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, getbank, "Bank account found"));
  } catch (error) {
    throw new ApiError(500, null, "Internal Server Error");
  }
});

//! Create a new bank account
const handleCreateBankAccount = asyncHandler(async (req, res) => {
  const { name, ifsc, branch, accountNumber, amount, accountType } = req.body;
  console.table(req.body);
  console.log(req?.user);

  try {
    if (!name) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Bank account name is required"));
    }

    const createdBank = await Bank.create({
      name,
      ifsc,
      branch,
      accountNumber,
      amount,
      accountType,
      user: req?.user?._id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, createdBank, "Bank account created"));
  } catch (error) {
    console.log("Internal error", error);
    throw new ApiError(500, null, "Internal Server Error");
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

    const deletedBank = await Bank.findOneAndDelete({
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
        new ApiResponse(200, deletedBank, "Bank account deleted successfully")
      );
  } catch (error) {
    throw new ApiError(500, null, "Internal Server Error");
  }
});

//! Edit a bank account
const handleEditBankAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    ifsc,
    branch,
    accountNumber,
    amount,
    accountType,
    accountUsedAs,
  } = req.body;

  try {
    if (!id) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Bank account ID is required"));
    }

    if (!name) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Bank account name is required"));
    }

    const updatedBank = await Bank.findOneAndUpdate(
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

    if (!updatedBank) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Bank account not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedBank, "Bank account updated"));
  } catch (error) {
    throw new ApiError(500, null, "Internal Server Error");
  }
});

export {
  handleGetBankAccounts,
  handleGetBankAccountById,
  handleCreateBankAccount,
  handleDeleteBankAccount,
  handleEditBankAccount,
};
