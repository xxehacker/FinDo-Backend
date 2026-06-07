import express from "express";
import {
  handleCreateEmi,
  handleGetEmis,
  handleGetEmiById,
  handlePayInstallment,
  handleGetDashboardStats,
  handleUpdateEmi,
  handleDeleteEmi,
} from "../controllers/emi.controller.js";

const router = express.Router();

router.post("/create", handleCreateEmi);
router.get("/get-all", handleGetEmis);
router.get("/stats", handleGetDashboardStats);
router.get("/:id", handleGetEmiById);
router.post("/pay-installment/:installmentId", handlePayInstallment);
router.put("/edit/:id", handleUpdateEmi);
router.delete("/delete/:id", handleDeleteEmi);

export default router;
