import express from "express";
import {
  handleAddProduct,
  handleGetAllProducts,
  handleGetProductById,
  handleDeleteProduct,
  handleRefreshProduct,
  handleTogglePurchasedProduct,
} from "../controllers/wishlist.controller.js";

const router = express.Router();

router.post("/add", handleAddProduct);
router.get("/get-all", handleGetAllProducts);
router.get("/:id", handleGetProductById);
router.delete("/delete/:id", handleDeleteProduct);
router.post("/refresh/:id", handleRefreshProduct);
router.post("/toggle-purchased/:id", handleTogglePurchasedProduct);

export default router;
