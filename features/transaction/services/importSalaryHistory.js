import Category from "../../category/models/category.model.js";
import Transaction from "../models/transaction.model.js";
import {
  buildSalaryEntries,
  SALARY_CATEGORY_NAME,
} from "../constants/salarySchedule.js";
import updateDayWiseSummary from "../utils/updateDayWiseSummary.js";

async function findOrCreateSalaryCategory(userId) {
  let category = await Category.findOne({
    name: SALARY_CATEGORY_NAME,
    createdBy: userId,
  });

  if (!category) {
    category = await Category.create({
      name: SALARY_CATEGORY_NAME,
      description: "Monthly salary income",
      type: "income",
      status: "active",
      createdBy: userId,
    });
  } else if (category.type !== "income") {
    category.type = "income";
    category.status = "active";
    await category.save();
  }

  return category;
}

async function salaryExistsForMonth(userId, categoryId, date) {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const existing = await Transaction.findOne({
    user: userId,
    category: categoryId,
    type: "income",
    date: { $gte: start, $lt: end },
  });

  return Boolean(existing);
}

/**
 * Import tiered salary as monthly income transactions (May 2025 – May 2026).
 * @param {string|import('mongoose').Types.ObjectId} userId
 */
export async function importSalaryHistory(userId) {
  const category = await findOrCreateSalaryCategory(userId);
  const schedule = buildSalaryEntries();

  const created = [];
  const skipped = [];

  for (const entry of schedule) {
    const exists = await salaryExistsForMonth(userId, category._id, entry.date);
    if (exists) {
      skipped.push({
        month: entry.description,
        amount: entry.amount,
        reason: "already_exists",
      });
      continue;
    }

    const transaction = await Transaction.create({
      type: "income",
      amount: entry.amount,
      description: entry.description,
      category: category._id,
      date: entry.date,
      user: userId,
      bankAccount: null,
      transactionMethod: "other",
      transactionStatus: "successful",
      notes: `Employment month ${entry.employmentMonth}`,
      timeOFDay: "morning",
      attachment: "",
    });

    await updateDayWiseSummary(transaction, "create");

    created.push({
      id: transaction._id,
      month: entry.description,
      amount: entry.amount,
      date: entry.date,
    });
  }

  return {
    categoryId: category._id,
    categoryName: category.name,
    created: created.length,
    skipped: skipped.length,
    entries: { created, skipped },
  };
}
