import express from "express";
import {
  handleLogin,
  handleSignup,
  handleCheckUser,
} from "../controllers/user.controllers.js";
import { authenticateToken } from "../../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", handleSignup);
router.post("/login", handleLogin);
router.get("/profile", authenticateToken, handleCheckUser);

export default router;
