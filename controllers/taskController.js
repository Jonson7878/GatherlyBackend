import mongoose from "mongoose";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import { taskValidation } from "../validation/taskValidation.js";

export const createTask = async (req, res) => {
    try {
        const { taskName, description, assignBy, assignTo, priority, startDate, endDate } = req.body;

        const { error } = taskValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ status: false, message: error.details[0].message });
        }

        const assigningUser = await User.findOne({ _id: assignBy, role: { $in: ["admin", "manager"] } });
        if (!assigningUser) {
            return res.status(403).json({ status: false, message: "Only admins and manager create the task..." });
        }

        const assignedUser = await User.findOne({ _id: assignTo, role: { $in: ["employee", "guest"] } });
        if (!assignedUser) {
            return res.status(400).json({ status: false, message: "Invalid assignTo user role." });
        }

        const task = await Task.create({
            taskName,
            description,
            assignBy,
            assignTo,
            priority,
            startDate,
            endDate,
        });

        return res.status(201).json({ status: true, message: "Task created successfully", task });

    } catch (error) {
        console.error("Error creating task:", error);
        return res.status(500).json({ status: false, message: "Server error while creating task." });
    }
};

export const TaskCompletion = async (req, res) => {
    try {
        const { id } = req.params;
        const { isCompleted } = req.body;
        const { id: userId, role } = req.user;

        if (!["employee", "guest"].includes(role)) {
            return res.status(403).json({ status: false, message: "Only employees and guests can update task completion." });
        }

        const task = await Task.findOne({ _id: id, assignTo: userId });

        if (!task) {
            return res.status(404).json({ status: false, message: "Task not found or not assigned to you." });
        }

        if (task.isCompleted && isCompleted) {
            return res.status(400).json({ status: false, message: "Task is already marked as completed." });
        }

        task.isCompleted = isCompleted;
        await task.save();

        return res.status(200).json({ status: true, message: "Task completion status updated successfully.", task });

    } catch (error) {
        console.error("Error updating task completion:", error);
        return res.status(500).json({ status: false, message: "Server error while updating task completion." });
    }
};

export const verifyTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    const { id: userId, role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ status: false, message: "Only admins can verify tasks." });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found." });
    }

    if (task.assignBy.toString() !== userId.toString()) {
      return res.status(403).json({ status: false, message: "You are not authorized to verify this task." });
    }

    if (isVerified && !task.isCompleted) {
      return res.status(400).json({ status: false, message: "Cannot verify a task that is not completed." });
    }

    task.isVerified = isVerified;

    if (!isVerified) {
      task.isCompleted = false;
    }

    await task.save();

    return res.status(200).json({
      status: true,
      message: `Task has been ${isVerified ? 'verified' : 'unverified'} successfully.`,
      task,
    });

  } catch (error) {
    console.error("Error verifying task:", error);
    return res.status(500).json({ status: false, message: "Server error while verifying task." });
  }
};

export const updateTaskDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { taskName, description, endDate } = req.body;
        const { role, id: userId } = req.user;

        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({ status: false, message: "Task not found." });
        }

        const currentUserId = new mongoose.Types.ObjectId(userId);

        const isAdminOrManager = role === "admin" || role === "manager";
        const isAssignee = task.assignTo && task.assignTo.equals(currentUserId);

        if (!isAdminOrManager && !isAssignee) {
            return res.status(403).json({ 
                status: false, 
                message: "Access denied. You can only update tasks assigned to you." 
            });
        }

        const updatedData = {
            ...(taskName !== undefined && { taskName }),
            ...(description !== undefined && { description }),
            ...(endDate !== undefined && { endDate })
        };

        Object.assign(task, updatedData);

        await task.save();

        return res.status(200).json({ 
            status: true, 
            message: "Task details updated successfully.", 
            task 
        });

    } catch (error) {
        console.error("Error updating task details:", error);
        return res.status(500).json({ 
            status: false, 
            message: "Server error while updating task details." 
        });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;

        let task;

        if (role === "admin") {
            task = await Task.findById(id);
        } else {
            task = await Task.findOne({ _id: id, assignBy: userId });
        }

        if (!task) {
            return res.status(404).json({ status: false, message: "Task not found" });
        }

        await Task.findByIdAndDelete(id);

        return res.status(200).json({ status: true, message: "Task deleted successfully." });

    } catch (error) {
        console.error("Error deleting task:", error);
        return res.status(500).json({ status: false, message: "Server error while deleting the task." });
    }
};

export const getAllTasks = async (req, res) => {
  try {
    const { role, id: userId, companyId } = req.user;
    const { status, latest, startDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ status: false, message: "Missing companyId in token" });
    }

    const baseQuery = {};

    if (status) {
      baseQuery.isCompleted = status === 'completed';
    }

    if (startDate) {
      const formattedStartDate = new Date(startDate);
      if (isNaN(formattedStartDate)) {
        return res.status(400).json({ status: false, message: "Invalid startDate format." });
      }
      const nextDay = new Date(formattedStartDate);
      nextDay.setDate(nextDay.getDate() + 1);
      baseQuery.startDate = { $gte: formattedStartDate, $lt: nextDay };
    }

    if (latest === 'true') {
      const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      baseQuery.createdAt = { $gte: past24Hours };
    }

    const tasks = await Task.find(baseQuery)
      .populate({
        path: 'assignBy',
        match: { companyId: new mongoose.Types.ObjectId(companyId) },
        select: 'username companyId',
        populate: {
          path: 'companyId',
          select: 'name',
        }
      })
      .populate('assignTo', 'username');

    const filteredTasks = tasks.filter(task => task.assignBy !== null);

    return res.status(200).json({
      status: true,
      message: "Tasks retrieved successfully.",
      tasks: filteredTasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ status: false, message: "Server error while fetching tasks." });
  }
};

export const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        const task = await Task.findById(id)
            .populate('assignBy', 'username')
            .populate('assignTo', 'username');

        if (!task) {
            return res.status(404).json({ status: false, message: "Task not found." });
        }

        if ((role === "employee" || role === "guest") && task.assignTo?._id?.toString() !== userId.toString()) {
            return res.status(403).json({ status: false, message: "You are not authorized to view this task." });
        }

        return res.status(200).json({ status: true, message: "Task retrieved successfully.", task });

    } catch (error) {
        console.error("Error fetching task by ID:", error);
        return res.status(500).json({ status: false, message: "Server error while fetching task." });
    }
};