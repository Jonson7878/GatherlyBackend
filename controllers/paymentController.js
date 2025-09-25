import razorpay from "../config/razorpay.js";
import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import mongoose from "mongoose";
import crypto from "crypto";

export const createOrder = async (req, res) => {
    try {
        const { 
            amount, 
            currency = 'INR', 
            orderId, 
            paymentMethod,
            prefill = {} 
        } = req.body;

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Payment method is required'
            });
        }

        if (!['card', 'upi', 'qr', 'netbanking', 'wallet'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method'
            });
        }

        const options = {
            amount: amount * 100,
            currency,
            receipt: orderId,
            payment_capture: 1
        };
        
        const order = await razorpay.orders.create(options);

        const payment = await Payment.create({
            orderId,
            razorpayOrderId: order.id,
            userId: req.user.id,
            amount,
            currency,
            paymentMethod,
            paymentMethodDetails: {
                preferredMethod: paymentMethod
            },
        });

        res.status(200).json({
            success: true,
            order,
            payment
        });
    } catch (error) {
        console.error('Error in createOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating payment order',
            error: error.message
        });
    }
};

export const verifyPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } =
        req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Payment verification failed",
            });
        }

        const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

        const paymentMethod = paymentDetails.method || "card";

        const payment = await Payment.findOneAndUpdate({
            razorpayOrderId: razorpay_order_id
        }, {
            razorpayPaymentId: razorpay_payment_id,
            status: "paid",
            paymentMethod,
            paymentMethodDetails: {
                method: paymentDetails.method,
                bank: paymentDetails.bank,
                wallet: paymentDetails.wallet,
                vpa: paymentDetails.vpa,
                card_network: paymentDetails.card?.network || null,
                card_type: paymentDetails.card?.type || null,
            },
        }, {
            new: true,
            session
        });

        if (!payment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Payment record not found",
            });
        }

        const order = await Order.findOneAndUpdate({
            _id: payment.orderId
        }, {
            paymentStatus: "Completed"
        }, {
            new: true,
            session
        });

        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: "Payment verified successfully and order status updated",
            payment,
            order,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error("Error in verifyPayment:", error);
        res.status(500).json({
            success: false,
            message: "Error verifying payment",
            error: error.message,
        });
    } finally {
        session.endSession();
    }
};

export const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        if (payment.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this payment",
            });
        }

        res.status(200).json({
            success: true,
            message: "Payment details fetched successfully",
            payment,
        });
    } catch (error) {
        console.error("Error in getPaymentById:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching payment details",
            error: error.message,
        });
    }
};

export const getUserPayments = async (req, res) => {
    try {
        const {
            page = 1, limit = 10
        } = req.query;

        const payments = await Payment.find({
                userId: req.user._id
            })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            message: "User payments fetched successfully",
            payments,
        });
    } catch (error) {
        console.error("Error in getUserPayments:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching user payments",
            error: error.message,
        });
    }
};