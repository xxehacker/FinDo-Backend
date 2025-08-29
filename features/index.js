import express from "express";
import authRouter from "./auth/routes/user.routes.js";
import categoryRouter from "./category/routes/category.routes.js";
import transactionRouter from "./transaction/routes/transaction.routes.js";
import taskRouter from "./task/routes/task.routes.js";
import bankRouter from "./bankAccount/routes/bank.routes.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/transaction", transactionRouter);
router.use("/task", taskRouter);
router.use("/category", categoryRouter);
router.use("/bank", bankRouter);

export default router;
