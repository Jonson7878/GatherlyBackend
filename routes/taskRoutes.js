import express from "express";
import { createTask, TaskCompletion, verifyTask, updateTaskDetails,deleteTask,getAllTasks,getTaskById } from "../controllers/taskController.js";

const router = express.Router();

router.post("/createtask", createTask);
router.patch("/completetask/:id",  TaskCompletion);
router.patch("/verifytask/:id",  verifyTask);
router.put("/updatetask/:id", updateTaskDetails);
router.delete("/deletetask/:id", deleteTask);
router.get("/", getAllTasks);
router.get("/:id", getTaskById);


export default router;
