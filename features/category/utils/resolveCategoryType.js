import mongoose from "mongoose";
import Category from "../models/category.model.js";

/**
 * Resolve income/expense from the linked category (source of truth).
 */
export async function resolveTransactionTypeFromCategory(categoryId, userId) {
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    return { error: "Valid category is required" };
  }

  const category = await Category.findOne({
    _id: categoryId,
    createdBy: userId,
  }).select("type name status");

  if (!category) {
    return { error: "Category not found or does not belong to you" };
  }

  if (category.status === "inactive") {
    return { error: `Category "${category.name}" is inactive` };
  }

  return { type: category.type, category };
}
