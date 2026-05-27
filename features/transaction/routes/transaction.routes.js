import express from "express";
import {
  handleGetTransactions,
  handleCreateTransaction,
  handleUpdateTransaction,
  handleDeleteTransaction,
  handleGetTransactionById,
  handleGetDayWiseSummary,
} from "../controllers/transaction.controllers.js";

const router = express.Router();

//! get all
router.get("/day-wise-summary", handleGetDayWiseSummary);

router.get("/get-all", handleGetTransactions);
router.get("/:id", handleGetTransactionById);
router.post("/add", handleCreateTransaction);
router.put("/edit/:id", handleUpdateTransaction);
router.delete("/delete/:id", handleDeleteTransaction);

//! Day-wise Transaction Routes
//! create day-wise
// router.post("/day-wise", handleCreateDayWiseTransaction);

export default router;
