import mongoose from "mongoose";
import Transaction from "../../transaction/models/transaction.model.js";
import Task from "../../task/models/task.model.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

function toUserObjectId(userId) {
  return userId instanceof mongoose.Types.ObjectId
    ? userId
    : new mongoose.Types.ObjectId(String(userId));
}

function sumByType(rows) {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  rows.forEach((item) => {
    if (item._id === "income") {
      income = item.total;
      incomeCount = item.count ?? 0;
    } else if (item._id === "expense") {
      expense = item.total;
      expenseCount = item.count ?? 0;
    }
  });

  return { income, expense, incomeCount, expenseCount };
}

function buildLast6MonthBuckets(now) {
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: d.toLocaleString("en-US", { month: "long" }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }
  return buckets;
}

// @desc    Get dashboard data for current user
// @route   GET /api/dashboard
// @access  Private
const getDashboardData = asyncHandler(async (req, res) => {
  const userObjectId = toUserObjectId(req.user._id);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999
  );
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    allTimeTotals,
    currentMonthTotals,
    lastMonthTotals,
    monthlyAgg,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: userObjectId } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const allTime = sumByType(allTimeTotals);
  const month = sumByType(currentMonthTotals);
  const lastMonth = sumByType(lastMonthTotals);

  const totalIncome = allTime.income;
  const totalExpenses = allTime.expense;
  const totalBalance = totalIncome - totalExpenses;

  const monthIncome = month.income;
  const monthExpenses = month.expense;
  const monthBalance = monthIncome - monthExpenses;

  const incomeChange =
    lastMonth.income > 0
      ? ((monthIncome - lastMonth.income) / lastMonth.income) * 100
      : monthIncome > 0
        ? 100
        : 0;

  const expenseChange =
    lastMonth.expense > 0
      ? ((monthExpenses - lastMonth.expense) / lastMonth.expense) * 100
      : monthExpenses > 0
        ? 100
        : 0;

  const monthBuckets = buildLast6MonthBuckets(now);
  const incomeData = [];
  const expenseData = [];

  monthBuckets.forEach(({ label, year, month: monthNum }) => {
    const incomeRow = monthlyAgg.find(
      (row) =>
        row._id.year === year &&
        row._id.month === monthNum &&
        row._id.type === "income"
    );
    const expenseRow = monthlyAgg.find(
      (row) =>
        row._id.year === year &&
        row._id.month === monthNum &&
        row._id.type === "expense"
    );

    incomeData.push({ month: label, amount: incomeRow?.total ?? 0 });
    expenseData.push({ month: label, amount: expenseRow?.total ?? 0 });
  });

  const taskStats = await Task.aggregate([
    { $match: { createdBy: userObjectId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  let totalTasks = 0;
  let completedTasks = 0;
  let pendingTasks = 0;
  let inProgressTasks = 0;

  taskStats.forEach((item) => {
    totalTasks += item.count;
    if (item._id === "completed") completedTasks = item.count;
    else if (item._id === "pending") pendingTasks = item.count;
    else if (item._id === "in_progress") inProgressTasks = item.count;
  });

  const recentTransactions = await Transaction.find({ user: userObjectId })
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .populate("category", "name type")
    .populate("bankAccount", "name accountNumber")
    .lean();

  const formattedTransactions = recentTransactions.map((txn) => ({
    id: txn._id,
    description: txn.description || txn.category?.name || "Transaction",
    category: txn.category?.name || "Uncategorized",
    amount: txn.amount,
    type: txn.type,
    date: txn.date,
    bankAccount: txn.bankAccount
      ? `${txn.bankAccount.name} - ${txn.bankAccount.accountNumber || ""}`
      : null,
    transactionMethod: txn.transactionMethod,
    transactionStatus: txn.transactionStatus,
  }));

  const userTasks = await Task.find({
    createdBy: userObjectId,
    status: { $in: ["pending", "in_progress"] },
  })
    .sort({ endDate: 1, createdAt: -1 })
    .limit(5)
    .lean();

  const formattedTasks = userTasks.map((task) => ({
    id: task._id,
    title: task.title,
    description: task.description,
    priority: task.difficulty,
    progress: task.progress,
    dueDate: task.endDate,
    status: task.status,
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        summary: {
          totalIncome,
          totalExpenses,
          totalBalance,
          monthIncome,
          monthExpenses,
          monthBalance,
          incomeCount: allTime.incomeCount,
          monthIncomeCount: month.incomeCount,
          incomeChange: Math.round(incomeChange * 10) / 10,
          expenseChange: Math.round(expenseChange * 10) / 10,
        },
        monthlyTrend: {
          incomeData,
          expenseData,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
        },
        recentTransactions: formattedTransactions,
        upcomingTasks: formattedTasks,
      },
      "Dashboard data fetched successfully"
    )
  );
});

// @desc    Get dashboard stats (simple version)
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
  const userObjectId = toUserObjectId(req.user._id);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const [allTimeTotals, monthTotals] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: userObjectId } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const allTime = sumByType(allTimeTotals);
  const month = sumByType(monthTotals);

  const taskCounts = await Task.countDocuments({ createdBy: userObjectId });
  const completedTasks = await Task.countDocuments({
    createdBy: userObjectId,
    status: "completed",
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        income: allTime.income,
        expense: allTime.expense,
        balance: allTime.income - allTime.expense,
        monthIncome: month.income,
        monthExpense: month.expense,
        monthBalance: month.income - month.expense,
        totalTasks: taskCounts,
        completedTasks,
      },
      "Stats fetched successfully"
    )
  );
});

export { getDashboardData, getDashboardStats };
