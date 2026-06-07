import mongoose from "mongoose";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import EMI from "../models/emi.model.js";
import Installment from "../models/installment.model.js";
import WishlistProduct from "../../wishlist/models/wishlistProduct.model.js";
import Category from "../../category/models/category.model.js";
import Transaction from "../../transaction/models/transaction.model.js";
import updateDayWiseSummary from "../../transaction/utils/updateDayWiseSummary.js";

const getUserId = (req) => req.user?._id || req.user?.id;

/**
 * Helper to find or create a default active expense category for EMI payments.
 */
const getOrCreateDefaultCategory = async (userId) => {
  let category = await Category.findOne({
    createdBy: userId,
    type: "expense",
    status: "active",
    name: /Shopping|Bills|EMI/i,
  });

  if (!category) {
    category = await Category.findOne({
      createdBy: userId,
      type: "expense",
      status: "active",
    });
  }

  if (!category) {
    category = await Category.create({
      name: "Shopping",
      description: "Default category for Price Tracker purchases & BNPL payments",
      type: "expense",
      status: "active",
      createdBy: userId,
    });
  }

  return category;
};

/**
 * POST /api/v1/emi/create
 * Mark a wishlist product purchased and set up its Snapmint/Flipkart Pay in 3 BNPL plan.
 */
export const handleCreateEmi = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const {
    wishlistProductId,
    provider,
    emiType,
    totalAmount,
    downPayment,
    installmentCount,
    installmentAmount,
    firstDueDate,
    notes,
    autoExpense,
    bankAccountId,
    transactionMethod,
  } = req.body;

  if (!wishlistProductId || !provider || !totalAmount || !installmentCount || !installmentAmount || !firstDueDate) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Required fields are missing"));
  }

  // 1. Fetch and validate product ownership
  const product = await WishlistProduct.findOne({ _id: wishlistProductId, user: userId });
  if (!product) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found in your tracker"));
  }

  if (product.isPurchased) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "This product has already been marked as purchased"));
  }

  const financedAmt = totalAmount - downPayment;

  // 2. Create the EMI model
  const emi = await EMI.create({
    user: userId,
    wishlistProduct: wishlistProductId,
    provider,
    emiType: emiType || "no_cost_emi",
    totalAmount,
    downPayment: downPayment || 0,
    financedAmount: financedAmt,
    installmentCount,
    installmentAmount,
    firstDueDate: new Date(firstDueDate),
    paidInstallments: 0,
    totalPaidAmount: downPayment || 0,
    remainingAmount: financedAmt,
    status: "active",
    autoExpense: autoExpense !== false,
    notes: notes || "",
  });

  // 3. Generate Installments list
  const installmentsList = [];
  const startDueDate = new Date(firstDueDate);

  for (let i = 1; i <= installmentCount; i++) {
    const dueDate = new Date(startDueDate);
    dueDate.setMonth(startDueDate.getMonth() + (i - 1));

    installmentsList.push({
      emi: emi._id,
      installmentNo: i,
      dueDate,
      amount: installmentAmount,
      status: "pending",
    });
  }

  const createdInstallments = await Installment.insertMany(installmentsList);

  // 4. Update the first due date and next due date
  emi.nextDueDate = createdInstallments[0].dueDate;
  await emi.save();

  // 5. Update WishlistProduct purchased status and reference to EMI
  product.isPurchased = true;
  product.purchasedDate = new Date();
  product.emi = emi._id;
  await product.save();

  // 6. If downpayment > 0, auto-log downpayment transaction instantly
  if (downPayment > 0 && autoExpense !== false) {
    const category = await getOrCreateDefaultCategory(userId);
    const transaction = await Transaction.create({
      type: "expense",
      amount: downPayment,
      description: `Down payment (${provider.replace(/_/g, " ")}) - ${product.title.slice(0, 50)}`,
      category: category._id,
      date: new Date(),
      bankAccount: bankAccountId || null,
      transactionMethod: transactionMethod || "googlepay",
      transactionStatus: "successful",
      notes: `Down payment for BNPL price tracker item. Linked to EMI ID: ${emi._id}`,
      user: userId,
    });

    if (transaction.isDayWise) {
      await updateDayWiseSummary(transaction, "create");
    }
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      { emi, installments: createdInstallments },
      "EMI tracker successfully created and installments generated!"
    )
  );
});

/**
 * GET /api/v1/emi/get-all
 * Get all EMIs for current user with populated product.
 */
export const handleGetEmis = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const emis = await EMI.find({ user: userId })
    .populate("wishlistProduct")
    .sort({ createdAt: -1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, emis, "EMI trackers fetched successfully"));
});

/**
 * GET /api/v1/emi/:id
 * Get details of a single EMI tracker with its installments.
 */
export const handleGetEmiById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);

  const emi = await EMI.findOne({ _id: id, user: userId }).populate("wishlistProduct");
  if (!emi) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "EMI tracker not found"));
  }

  const installments = await Installment.find({ emi: id })
    .populate("linkedExpense")
    .sort({ installmentNo: 1 })
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      { emi, installments },
      "EMI tracker detail fetched successfully"
    )
  );
});

/**
 * POST /api/v1/emi/pay-installment/:installmentId
 * Mark a BNPL installment paid and auto-generate an expense transaction.
 */
export const handlePayInstallment = asyncHandler(async (req, res) => {
  const { installmentId } = req.params;
  const userId = getUserId(req);
  const { bankAccountId, transactionMethod, notes } = req.body;

  // 1. Fetch and validate installment
  const installment = await Installment.findById(installmentId);
  if (!installment) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Installment not found"));
  }

  const emi = await EMI.findOne({ _id: installment.emi, user: userId }).populate("wishlistProduct");
  if (!emi) {
    return res
      .status(403)
      .json(new ApiResponse(403, null, "Not authorized to pay this installment"));
  }

  if (installment.status === "paid") {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "This installment has already been paid"));
  }

  // 2. Mark installment as paid
  installment.status = "paid";
  installment.paymentDate = new Date();
  installment.paidAmount = installment.amount;
  installment.note = notes || installment.note || "";

  // 3. Update EMI metrics
  emi.paidInstallments += 1;
  emi.totalPaidAmount += installment.amount;
  emi.remainingAmount = Math.max(0, emi.totalAmount - emi.totalPaidAmount);

  if (emi.remainingAmount <= 0 || emi.paidInstallments >= emi.installmentCount) {
    emi.status = "completed";
    emi.nextDueDate = null;
  } else {
    // Determine next due date
    const nextPending = await Installment.findOne({
      emi: emi._id,
      status: "pending",
      _id: { $ne: installmentId },
    }).sort({ dueDate: 1 });

    emi.nextDueDate = nextPending ? nextPending.dueDate : null;
  }

  // 4. Create standard Transaction Expense if autoExpense is enabled
  if (emi.autoExpense) {
    const category = await getOrCreateDefaultCategory(userId);
    const transaction = await Transaction.create({
      type: "expense",
      amount: installment.amount,
      description: `EMI Pay Installment #${installment.installmentNo}/${emi.installmentCount} (${emi.provider.replace(/_/g, " ")}) - ${emi.wishlistProduct.title.slice(0, 40)}`,
      category: category._id,
      date: new Date(),
      bankAccount: bankAccountId || null,
      transactionMethod: transactionMethod || "googlepay",
      transactionStatus: "successful",
      notes: `Installment #${installment.installmentNo} payment logged automatically. Linked to EMI ID: ${emi._id}`,
      user: userId,
    });

    if (transaction.isDayWise) {
      await updateDayWiseSummary(transaction, "create");
    }
    installment.linkedExpense = transaction._id;
  }

  await installment.save();
  await emi.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { installment, emi },
      "Installment successfully paid and expense transaction logged!"
    )
  );
});

/**
 * GET /api/v1/emi/stats
 * BNPL specific aggregate statistics.
 */
export const handleGetDashboardStats = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const emis = await EMI.find({ user: userId }).lean();

  let totalBNPLDebt = 0;
  let totalPaid = 0;
  let activeCount = 0;
  let settledCount = 0;
  let upcomingDues30Days = 0;
  let overdueCount = 0;

  const now = new Date();
  const next30Days = new Date();
  next30Days.setDate(now.getDate() + 30);

  const providerStatsMap = {};

  for (const emi of emis) {
    totalPaid += emi.totalPaidAmount;

    if (emi.status === "active") {
      totalBNPLDebt += emi.remainingAmount;
      activeCount += 1;

      if (emi.nextDueDate && new Date(emi.nextDueDate) < now) {
        overdueCount += 1;
      }
    } else if (emi.status === "completed") {
      settledCount += 1;
    }

    // Provider grouping
    const providerName = emi.provider;
    providerStatsMap[providerName] = (providerStatsMap[providerName] || 0) + emi.remainingAmount;
  }

  // Aggregate pending installments in the next 30 days
  const pendingDues = await Installment.find({
    status: "pending",
    dueDate: { $gte: now, $lte: next30Days },
  }).populate({
    path: "emi",
    match: { user: userId },
  });

  for (const inst of pendingDues) {
    if (inst.emi) {
      upcomingDues30Days += inst.amount;
    }
  }

  const providerStats = Object.keys(providerStatsMap).map((k) => ({
    provider: k,
    amount: providerStatsMap[k],
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalBNPLDebt,
        totalPaid,
        activeCount,
        settledCount,
        upcomingDues30Days,
        overdueCount,
        providerStats,
      },
      "BNPL stats aggregated successfully"
    )
  );
});

/**
 * PUT /api/v1/emi/edit/:id
 * Edit notes or options of an EMI plan.
 */
export const handleUpdateEmi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const { notes, autoExpense, reminderEnabled } = req.body;

  const emi = await EMI.findOneAndUpdate(
    { _id: id, user: userId },
    {
      $set: {
        notes: notes || "",
        autoExpense: autoExpense !== false,
        reminderEnabled: reminderEnabled !== false,
      },
    },
    { new: true }
  );

  if (!emi) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "EMI tracker not found or access denied"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, emi, "EMI tracker updated successfully"));
});

/**
 * DELETE /api/v1/emi/delete/:id
 * Deletes an EMI plan, sets product back to isPurchased: false, and cleans up installments.
 */
export const handleDeleteEmi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);

  const emi = await EMI.findOne({ _id: id, user: userId });
  if (!emi) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "EMI tracker not found"));
  }

  // Restore the product isPurchased state to false
  await WishlistProduct.findByIdAndUpdate(emi.wishlistProduct, {
    $set: {
      isPurchased: false,
      purchasedDate: null,
      emi: null,
    },
  });

  // Remove installments
  await Installment.deleteMany({ emi: id });

  // Delete EMI
  await EMI.deleteOne({ _id: id });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "EMI tracker deleted and product tracking restored"));
});
