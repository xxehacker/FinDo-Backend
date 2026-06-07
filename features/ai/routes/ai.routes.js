import express from "express";
import { generateAiSuggestions, handleAiChat } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/suggestion", generateAiSuggestions);
router.post("/chat", handleAiChat);

export default router;
