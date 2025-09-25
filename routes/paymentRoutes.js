import express from 'express';
import {createOrder,verifyPayment,getPaymentById,getUserPayments} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-order', createOrder);

router.post('/verify', verifyPayment);

router.get('/:id', getPaymentById);

router.get('/user/payments', getUserPayments);


export default router;