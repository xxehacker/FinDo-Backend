import express from "express";
import {
  handleGetTasks,
  handleGetTaskById,
  handleCreateTask,
  handleDeleteTask,
  handleEditTask,
} from "../controllers/task.controllers.js";

const router = express.Router();

router.get("/get-all", handleGetTasks);
router.get("/:id", handleGetTaskById);
router.post("/add", handleCreateTask);
router.put("/edit/:id", handleEditTask);
router.delete("/delete/:id", handleDeleteTask);

export default router;
