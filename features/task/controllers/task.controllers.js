import { ApiResponse } from "@/../../utils/ApiResponse.js";
import { asyncHandler } from "@/../../utils/asyncHandler.js";
import Task from "../models/task.model.js";
import { ApiError } from "@/../../utils/ApiError.js";

const handleCreateTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    difficulty,
    status,
    progress,
    startDate,
    endDate,
    subtasks,
  } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  if (subtasks && !Array.isArray(subtasks)) {
    throw new ApiError(400, "Subtasks must be an array");
  }

  const task = await Task.create({
    title,
    description,
    difficulty,
    status,
    progress,
    startDate,
    endDate,
    createdBy: userId,
    subtasks,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});
const handleGetTasks = asyncHandler(async (req, res) => {
  const userId = req?.user?.id;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const tasks = await Task.find({ createdBy: userId });

  if (tasks.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, [], "No tasks found for this user"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks retrieved successfully"));
});
const handleGetTaskById = asyncHandler(async (req, res) => {
  const { id: taskId } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  if (!taskId) {
    throw new ApiError(400, "Task ID is required");
  }

  const task = await Task.findOne({ _id: taskId, createdBy: userId });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task retrieved successfully"));
});
const handleDeleteTask = asyncHandler(async (req, res) => {
  const { id: taskId } = req.params;
  const userId = req?.user?.id;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  if (!taskId) {
    throw new ApiError(400, "Task ID is required");
  }

  const task = await Task.findOneAndDelete({ _id: taskId, createdBy: userId });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Task deleted successfully"));
});
const handleEditTask = asyncHandler(async (req, res) => {
  const { id: taskId } = req.params;
  const userId = req?.user?.id;
  const {
    title,
    description,
    difficulty,
    status,
    progress,
    startDate,
    endDate,
    subtasks,
  } = req.body;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  if (!taskId) {
    throw new ApiError(400, "Task ID is required");
  }

  if (subtasks && !Array.isArray(subtasks)) {
    throw new ApiError(400, "Subtasks must be an array");
  }

  const updates = {};
  if (title) updates.title = title;
  if (description) updates.description = description;
  if (difficulty) updates.difficulty = difficulty;
  if (status) updates.status = status;
  if (progress !== undefined) updates.progress = progress;
  if (startDate) updates.startDate = startDate;
  if (endDate) updates.endDate = endDate;
  if (subtasks) updates.subtasks = subtasks;

  const task = await Task.findOneAndUpdate(
    { _id: taskId, createdBy: userId },
    { $set: updates },
    { new: true }
  );

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
});

export {
  handleGetTasks,
  handleGetTaskById,
  handleCreateTask,
  handleDeleteTask,
  handleEditTask,
};
