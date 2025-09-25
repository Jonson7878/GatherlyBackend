import express from 'express';
import { createUserProfile, updateUserProfile, deleteUserProfile } from '../controllers/userProfileController.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.post('/create', upload.single('profileImage'), createUserProfile);

router.put('/update',  upload.single('profileImage'), updateUserProfile);

router.delete('/delete', deleteUserProfile);

export default router;