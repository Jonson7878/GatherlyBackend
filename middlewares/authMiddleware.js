import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ status: false, message: "Unauthorized. No token provided." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ status: false, message: "Unauthorized. Invalid token." });
        }

        // Attach minimal user info to req.user for downstream use
        req.user = {
            id: user._id,
            role: user.role,
            companyId: user.companyId,
        };

        next();
    } catch (error) {
        console.error("Authentication Error:", error);
        return res.status(401).json({ status: false, message: "Unauthorized. Invalid token." });
    }
};
