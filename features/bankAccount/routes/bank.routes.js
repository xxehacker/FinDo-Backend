import express from "express";
import {
  handleGetBankAccounts,
  handleGetBankAccountById,
  handleCreateBankAccount,
  handleDeleteBankAccount,
  handleEditBankAccount,
} from "../controllers/bank.controllers.js";

const router = express.Router();

router.get("/get-all", handleGetBankAccounts);
router.get("/:id", handleGetBankAccountById);
router.post("/add", handleCreateBankAccount);
router.put("/edit/:id", handleEditBankAccount);
router.delete("/delete/:id", handleDeleteBankAccount);

export default router;
