import express from "express";
import {
  handleCreateCategory,
  handleGetCategories,
  handleGetCategory,
  handleEditCategory,
  handleDeleteCategory,
} from "../controllers/category.controllers.js";

const router = express();

router.get("/get-all", handleGetCategories);
router.get("/:id", handleGetCategory);
router.post("/add", handleCreateCategory);
router.put("/edit/:id", handleEditCategory);
router.delete("/delete/:id", handleDeleteCategory);

export default router;
