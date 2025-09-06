import Category from "../models/category.model.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";

//! create category
const handleCreateCategory = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;
  const userId = req.user.id;

  try {
    if (!name || !description || !status) {
      throw new ApiError(400, "Name ,description and status are required");
    }

    if (!userId) {
      throw new ApiError(400, "User id is missing");
    }

    const category = await Category.create({
      name,
      description,
      status,
      createdBy: userId,
    });
    res
      .status(201)
      .json(new ApiResponse(201, category, "Category created successfully"));
  } catch (error) {
    console.log("Internal error", error);
    throw new ApiError(
      500,
      null,
      "Something went wrong while creating the category"
    );
  }
});

//! get all categories
const handleGetCategories = async (req, res) => {
  const userId = req.user.id;

  try {
    if (!userId) {
      throw new ApiError(400, "User id is missing");
    }

    const categories = await Category.find({ createdBy: userId });
    res
      .status(200)
      .json(
        new ApiResponse(200, categories, "Categories fetched successfully")
      );
  } catch (error) {
    console.log("Internal error", error);
    throw new ApiError(
      500,
      null,
      "Something went wrong while getting the categories"
    );
  }
};

//! get single category
const handleGetCategory = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id) {
      throw new ApiError(400, "Category id is missing");
    }

    const category = await Category.findOne({ _id: id });
    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, category, "Category fetched successfully"));
  } catch (error) {}
};

//! edit category
const handleEditCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  try {
    if (!id) {
      throw new ApiError(400, "Category id is missing");
    }

    const category = await Category.findOneAndUpdate(
      { _id: id },
      { $set: { name, description, status } },
      { new: true }
    );

    res
      .status(200)
      .json(new ApiResponse(200, category, "Category updated successfully"));
  } catch (error) {
    console.log("Internal error", error);
    throw new ApiError(
      500,
      null,
      "Something went wrong while updating the category"
    );
  }
};

//! delete category
const handleDeleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      throw new ApiError(400, "Category id is missing");
    }
    const category = await Category.findOneAndDelete({ _id: id });
    res
      .status(200)
      .json(new ApiResponse(200, category, "Category deleted successfully"));
  } catch (error) {
    console.log("Internal error", error);
    throw new ApiError(
      500,
      null,
      "Something went wrong while deleting the category"
    );
  }
};

export {
  handleCreateCategory,
  handleGetCategories,
  handleGetCategory,
  handleEditCategory,
  handleDeleteCategory,
};
