import jwt from 'jsonwebtoken';

export const generateResetToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
};
