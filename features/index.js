import express from "express";
import authRouter from "./auth/routes/user.routes.js";
import transactionRouter from "./transaction/routes/transaction.routes.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import taskRouter from "./task/routes/task.routes.js";
import bankRouter from "./bankAccount/routes/bank.routes.js";
import categoryRouter from "./category/routes/category.routes.js";
import dashboardRouter from "./dashboard/routes/dashboard.routes.js";
import productRouter from "./product/routes/product.routes.js";
import uploadRouter from "./upload/routes/upload.routes.js";
import wishlistRouter from "./wishlist/routes/wishlist.routes.js";
import emiRouter from "./emi/routes/emi.routes.js";
import aiRouter from "./ai/routes/ai.routes.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/transaction", authenticateToken, transactionRouter);
router.use("/category", authenticateToken, categoryRouter);
router.use("/bank", authenticateToken, bankRouter);
router.use("/task", authenticateToken, taskRouter);
router.use("/dashboard", authenticateToken, dashboardRouter);
router.use("/product", authenticateToken, productRouter);
router.use("/upload", authenticateToken, uploadRouter);
router.use("/wishlist", authenticateToken, wishlistRouter);
router.use("/emi", authenticateToken, emiRouter);
router.use("/ai", authenticateToken, aiRouter);

export default router;
