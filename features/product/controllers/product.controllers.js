import mongoose from "mongoose";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import Product from "../models/product.model.js";
import Category from "../../category/models/category.model.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";

const getUserId = (req) => req.user?._id || req.user?.id;

const populateOptions = {
  path: "category",
  select: "name description status",
};

const resolveUserCategory = async (categoryId, userId) => {
  if (!categoryId) {
    return { error: "Category is required" };
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return { error: "Invalid category ID" };
  }

  const category = await Category.findOne({
    _id: categoryId,
    createdBy: userId,
  }).lean();

  if (!category) {
    return { error: "Category not found or does not belong to you" };
  }

  return { category };
};

const handleGetProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ user: getUserId(req) })
    .populate(populateOptions)
    .select("name description category estimatedPrice status createdAt updatedAt")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      products,
      products.length ? "Products found" : "No products found"
    )
  );
});

const handleGetProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Product ID is required"));
  }

  const product = await Product.findOne({
    _id: id,
    user: getUserId(req),
  })
    .populate(populateOptions)
    .lean();

  if (!product) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product found"));
});

const handleCreateProduct = asyncHandler(async (req, res) => {
  const { name, description, category, estimatedPrice, status, attachment } =
    req.body;
  const userId = getUserId(req);

  if (!name?.trim()) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Product name is required"));
  }

  const { category: validCategory, error } = await resolveUserCategory(
    category,
    userId
  );
  if (error) {
    return res.status(400).json(new ApiResponse(400, null, error));
  }

  const created = await Product.create({
    name: name.trim(),
    description: description?.trim() || "",
    category: validCategory._id,
    estimatedPrice: Number(estimatedPrice) || 0,
    status: status || "active",
    attachment: attachment || "",
    user: userId,
  });

  const populated = await Product.findById(created._id)
    .populate(populateOptions)
    .lean();

  return res
    .status(201)
    .json(new ApiResponse(201, populated, "Product created successfully"));
});

const handleEditProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, category, estimatedPrice, status, attachment } =
    req.body;
  const userId = getUserId(req);

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Product ID is required"));
  }

  if (!name?.trim()) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Product name is required"));
  }

  const { category: validCategory, error } = await resolveUserCategory(
    category,
    userId
  );
  if (error) {
    return res.status(400).json(new ApiResponse(400, null, error));
  }

  const updated = await Product.findOneAndUpdate(
    { _id: id, user: userId },
    {
      $set: {
        name: name.trim(),
        description: description?.trim() || "",
        category: validCategory._id,
        estimatedPrice: Number(estimatedPrice) || 0,
        status: status || "active",
        attachment: attachment || "",
      },
    },
    { new: true, runValidators: true }
  )
    .populate(populateOptions)
    .lean();

  if (!updated) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Product updated successfully"));
});

const handleDeleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Product ID is required"));
  }

  const deleted = await Product.findOneAndDelete({
    _id: id,
    user: getUserId(req),
  });

  if (!deleted) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleted, "Product deleted successfully"));
});

export {
  handleGetProducts,
  handleGetProductById,
  handleCreateProduct,
  handleEditProduct,
  handleDeleteProduct,
};
