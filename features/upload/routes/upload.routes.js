import express from "express";
import { upload } from "../../../middlewares/multer.middleware.js";
import { handleUploadFile } from "../controllers/upload.controller.js";

const router = express.Router();

router.post("/", upload.single("file"), handleUploadFile);

export default router;
