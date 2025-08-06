import express from "express";
import { handleLogin, handleSignup , handleCheckUser } from "../controllers/user.controllers.js";

const router = express.Router();

router.post("/signup", handleSignup);
router.post("/login", handleLogin);
router.get("/profile",handleCheckUser);

export default router;
