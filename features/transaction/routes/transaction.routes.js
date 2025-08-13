import express from "express";
import {
  handleGetTransactions,
  handleCreateTransaction,
  handleUpdateTransaction,
  handleDeleteTransaction,
  handleGetTransactionById,
  handleDayWiseTransaction
} from "../controllers/transaction.controllers.js";

const router = express.Router();

router.get("/get-all", handleGetTransactions);
router.get("/:id", handleGetTransactionById);
router.post("/add", handleCreateTransaction);
router.put("/edit/:id", handleUpdateTransaction);
router.delete("/delete/:id", handleDeleteTransaction);

//! Day wise transaction
router.get("/day-wise", handleDayWiseTransaction);

export default router;
