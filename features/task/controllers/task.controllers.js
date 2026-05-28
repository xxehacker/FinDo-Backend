import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiError } from "../../../utils/ApiError.js";
import Task from "../models/task.model.js";

const getUserId = (req) => req.user?._id || req.user?.id;

const normalizeSubtasksInput = (subtasks) => {
  if (!subtasks) return undefined;
  if (!Array.isArray(subtasks)) {
    throw new ApiError(400, "Subtasks must be an array");
  }
  return subtasks.map((st) => ({
    name: st.name || st.title || "",
    description: st.description || "",
    isCompleted: Boolean(st.isCompleted ?? st.completed),
  }));
};

const handleCreateTask = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    throw new ApiError(401, "User ID is required");
  }

  const {
    title,
    description,
    difficulty,
    status,
    progress,
    startDate,
    endDate,
    subtasks,
    archived,
  } = req.body;

  if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
  }

  const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 86400000);
  const start = startDate ? new Date(startDate) : new Date();

  const task = await Task.create({
    title: title.trim(),
    description: description?.trim() || "",
    difficulty: difficulty || "medium",
    status: status || "pending",
    progress: progress ?? 0,
    startDate: start,
    endDate: end,
    archived: Boolean(archived),
    createdBy: userId,
    subtasks: normalizeSubtasksInput(subtasks) || [],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

const handleGetTasks = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    throw new ApiError(401, "User ID is required");
  }

  const tasks = await Task.find({ createdBy: userId }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks retrieved successfully"));
});

const handleGetTaskById = asyncHandler(async (req, res) => {
  const { id: taskId } = req.params;
  const userId = getUserId(req);

  if (!userId) {
    throw new ApiError(401, "User ID is required");
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
  const userId = getUserId(req);

  if (!userId) {
    throw new ApiError(401, "User ID is required");
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
  const userId = getUserId(req);
  const {
    title,
    description,
    difficulty,
    status,
    progress,
    startDate,
    endDate,
    subtasks,
    archived,
  } = req.body;

  if (!userId) {
    throw new ApiError(401, "User ID is required");
  }

  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description.trim();
  if (difficulty !== undefined) updates.difficulty = difficulty;
  if (status !== undefined) updates.status = status;
  if (progress !== undefined) updates.progress = progress;
  if (startDate !== undefined) updates.startDate = new Date(startDate);
  if (endDate !== undefined) updates.endDate = new Date(endDate);
  if (archived !== undefined) updates.archived = Boolean(archived);
  if (subtasks !== undefined) updates.subtasks = normalizeSubtasksInput(subtasks);

  const task = await Task.findOneAndUpdate(
    { _id: taskId, createdBy: userId },
    { $set: updates },
    { new: true, runValidators: true }
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
