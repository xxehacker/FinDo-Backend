import express from "express";
import { handleLogin, handleSignup } from "../controllers/user.controllers.js";

const router = express.Router();

router.post("/signup", handleSignup);
router.post("/login", handleLogin);

export default router;
