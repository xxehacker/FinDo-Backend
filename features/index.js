import express from "express";
import authRouter from "./auth/routes/user.routes.js";
const router = express.Router();

router.use("/auth", authRouter);

export default router;
