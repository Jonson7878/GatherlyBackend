import express from "express";
import { 
  createCompany, 
  registerUser, 
  getAllCompanies, 
  deleteCompanyAndData, 
  getCompanyById,
  updateCompany 
} from "../controllers/companyController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", createCompany);
router.post("/register", registerUser);

router.get('/companies', verifyToken, getAllCompanies);
router.put("/update/:companyId", verifyToken, updateCompany);
router.delete("/:companyId", verifyToken, deleteCompanyAndData);

router.get('/me', verifyToken, getCompanyById);

export default router;
