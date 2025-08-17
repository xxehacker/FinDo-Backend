import express from "express";
import authRouter from "./auth/routes/user.routes.js";
import transactionRouter from "./transaction/routes/transaction.routes.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import taskRouter from './task/routes/task.routes.js'
import bankRouter from './bankAccount/routes/bank.routes.js'

const router = express.Router();

router.use("/auth", authRouter);
router.use("/transaction", authenticateToken, transactionRouter);
router.use("/category", transactionRouter);
router.use("/bank-account", bankRouter);
router.use("/task", taskRouter);

export default router;
