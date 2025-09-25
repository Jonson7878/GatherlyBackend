import express from "express";
import {
  createOrderSummary,
  getAllorders,
  updateOrder,
  deleteOrder,
  getEventWithAmount,
  getOrderById,
  getUserOrderHistory,
  getCompletedOrders,
  getUserCompletedOrders
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/", createOrderSummary);

router.get("/allorders", getAllorders); // (Pending payment) showing in the admin cart shown 

router.put("/update/:id", updateOrder);

router.delete("/delete/:id", deleteOrder);

router.post("/preview", getEventWithAmount);

router.get("/history",getUserOrderHistory) // user all order histroy without payment

router.get("/completed", getUserCompletedOrders); // (login user completed order show)

router.get("/:id", getOrderById); // (pending payment one order show)

router.get("/:orderId/completed",getCompletedOrders);

export default router;
