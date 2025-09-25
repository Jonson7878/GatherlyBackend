import express from "express";
import {
  createPromoCode,
  updatePromoCode,
  applyPromoCode,
  getAllPromoCodes,
  getPromoCodeById,
  setPromoCodeStatus,
  deletePromoCode,
  getActiveCodes,
  getPromoCodesByCompanyId
} from "../controllers/promoCodeController.js";


const router = express.Router();

router.post("/",createPromoCode);
router.patch("/update/:id",updatePromoCode);
router.patch("/:id/status",setPromoCodeStatus);
router.delete("/delete/:id",deletePromoCode);
router.get("/company", getPromoCodesByCompanyId);

router.get("/all", getAllPromoCodes);
router.get("/active",getActiveCodes)
router.get("/:id", getPromoCodeById);

router.post("/apply", applyPromoCode);


export default router;
