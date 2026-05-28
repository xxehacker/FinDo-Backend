import express from "express";
import {
  getDashboardData,
  getDashboardStats,
} from "../controllers/dashboard.controllers.js";
import { authenticateToken } from "../../../middlewares/auth.middleware.js";

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// @route   GET /api/dashboard
// @desc    Get complete dashboard data
// @access  Private
router.get("/", getDashboardData);

// @route   GET /api/dashboard/stats
// @desc    Get simple dashboard stats
// @access  Private
router.get("/stats", getDashboardStats);

export default router;
