import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const generateToken = (id, role, companyId) => {
    return jwt.sign(
        { id, role, companyId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};
