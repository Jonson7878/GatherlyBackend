import express from "express";
import { createManagedUser,updateManagedUser,deleteManagedUser, getAllManagedUsers,getSingleManagedUser } from "../controllers/managedUserController.js";

const router = express.Router();

router.post("/create",createManagedUser);
router.put("/update/:id",updateManagedUser);
router.delete("/delete/:id",deleteManagedUser);
router.get("/users",getAllManagedUsers);
router.get('/:id', getSingleManagedUser);

export default router;
