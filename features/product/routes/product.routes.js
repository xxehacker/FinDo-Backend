import express from "express";
import {
  handleGetProducts,
  handleGetProductById,
  handleCreateProduct,
  handleEditProduct,
  handleDeleteProduct,
} from "../controllers/product.controllers.js";

const router = express.Router();

router.get("/get-all", handleGetProducts);
router.get("/:id", handleGetProductById);
router.post("/add", handleCreateProduct);
router.put("/edit/:id", handleEditProduct);
router.delete("/delete/:id", handleDeleteProduct);

export default router;
