import User from "../models/userModel.js";
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";
import { validateUserRegistration } from "../validation/user-validation.js";
import { passwordValidator } from "../utils/validator.js";
import { generateToken } from '../utils/generateToken.js';
import { sendEmail } from '../utils/sendEmail.js';
import { generateResetToken } from '../utils/resetToken.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

export const createUser = async (req, res) => {
    const { username, email, password, confirmPassword, role, companyId } = req.body;

    const existingUsers = await User.find();

    const { error } = validateUserRegistration(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
    }

    if (!passwordValidator(password)) {
        return res.status(400).json({
            message: "Password must be 8-16 characters long, include at least one uppercase letter, one lowercase letter, one number, and one symbol (@, #, !, %, ^)."
        });
    }

    let assignedRole = role;
    if (existingUsers.length === 0) {
        assignedRole = "admin";
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        username,
        email,
        password: hashedPassword,
        companyId,
        role: assignedRole,
    });

    await newUser.save();

    res.status(201).json({ message: "User created successfully", user: { username, email, role: assignedRole } });
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log("Login attempt with email:", email);

        const user = await User.findOne({ email });

        if (!user) {
            console.log("User not found for email:", email);
            return res.status(401).json({ status: false, message: "Signup your account...." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log("Invalid password for user:", email);
            return res.status(401).json({ status: false, message: "Invalid credentials." });
        }

        if (user.twoFactorEnabled) {
            return res.status(200).json({
                status: 'awaiting_2fa',
                message: 'Please enter your two-factor authentication code',
                userId: user._id
            });
        }

        const token = generateToken(user._id, user.role, user.companyId);
        res.cookie("jwt", token, { httpOnly: true, secure: true });

        res.status(200).json({
            status: true,
            message: "Logged in successfully",
            token,
            user
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ status: false, message: "Server error during login." });
    }
};

export const setupTwoFactorAuth = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const secret = speakeasy.generateSecret({
            name: `CompanyOrg:${user.email}`
        });

        user.twoFactorSecret = secret.base32;
        user.twoFactorEnabled = false;
        await user.save();

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        res.status(200).json({
            message: 'Two-factor authentication setup initiated',
            qrCode: qrCodeUrl,
            secret: secret.base32
        });
    } catch (error) {
        console.error('Setup 2FA Error:', error);
        res.status(500).json({ message: 'Error setting up two-factor authentication' });
    }
};

export const verifyTwoFactorAuth = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token
        });

        if (!verified) {
            return res.status(400).json({ message: 'Invalid authentication code' });
        }

        user.twoFactorEnabled = true;
        await user.save();

        res.status(200).json({
            message: 'Two-factor authentication enabled successfully'
        });
    } catch (error) {
        console.error('Verify 2FA Error:', error);
        res.status(500).json({ message: 'Error verifying two-factor authentication' });
    }
};

export const validateTwoFactorAuth = async (req, res) => {
    try {
        const { userId, token } = req.body;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ message: 'Two-factor authentication is not enabled' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token
        });

        if (!verified) {
            return res.status(401).json({ message: 'Invalid authentication code' });
        }

        const authToken = generateToken(user._id, user.role, user.companyId);

        res.status(200).json({
            status: true,
            message: 'Two-factor authentication successfully..',
            token: authToken,
            user
        });
    } catch (error) {
        console.error('Validate 2FA Error:', error);
        res.status(500).json({ message: 'Error validating two-factor authentication' });
    }
};

export const verifyUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error("Error verifying user:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const sendResetLink = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }).populate("companyId");
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found." });
    }

    const companyName = user.companyId?.name || "Your Company";

    const token = generateResetToken(user._id);
    const resetLink = `http://localhost:3001/resetpassword/${token}`;

    const subject = `${companyName} - Password Reset`;
    const htmlContent = `
      <p>Hello ${user.username},</p>
      <p>You requested to reset your password for your ${companyName} account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p><strong>If you did not request this, please ignore this email.</strong></p>
      <br/>
      <p>Thanks,<br/><strong>${companyName}</strong> Team</p>
    `;

    await sendEmail(user.email, subject, htmlContent, companyName);

    res.status(200).json({ status: true, message: "Reset password link sent to email." });
  } catch (error) {
    console.error("Error in sendResetLink:", error);
    res.status(500).json({ status: false, message: "Internal server error." });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmNewPassword } = req.body;

  try {
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ status: false, message: "Passwords do not match." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).json({ status: false, message: "Password reset link has expired. Please request a new one." });
      }
      return res.status(400).json({ status: false, message: "Invalid password reset link. Please use the latest one sent to your email." });
    }

    const user = await User.findById(decoded.userId).populate('companyId');
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found for this token." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    const companyName = user.companyId?.name || "Your Company";
    const subject = `${companyName} - Password Reset Successful`;
    const htmlContent = `
      <p>Hi ${user.username},</p>
      <p>Your password for your ${companyName} account has been reset successfully.</p>
      <p><strong>If you did not perform this action, please contact support immediately.</strong></p>
      <br/>
      <p>Thanks,<br/><strong>${companyName}</strong> Team</p>
    `;

    await sendEmail(user.email, subject, htmlContent, companyName);

    res.status(200).json({ status: true, message: "Your password has been reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ status: false, message: "Internal server error." });
  }
};

// Admin reset password link
export const sendAdminResetLink = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }).populate("companyId");

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found." });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Only admins can request this reset link." });
    }

    if (!user.companyId) {
      return res.status(400).json({ status: false, message: "User company info missing." });
    }

    const token = generateResetToken(user._id);
    const resetLink = `http://localhost:3000/resetpassword/${token}`; // Admin
    const companyName = user.companyId.name;

    const subject = `${companyName} - Admin Password Reset`;
    const htmlContent = `
      <p>Hello ${user.username},</p>
      <p>You requested to reset your admin password for ${companyName}.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p><strong>If you did not request this, please ignore this email.</strong></p>
      <br/>
      <p>Thanks,<br/><strong>${companyName}</strong> Team</p>
    `;

    await sendEmail(user.email, subject, htmlContent, companyName);

    res.status(200).json({ status: true, message: "Reset password link sent to admin email." });
  } catch (error) {
    console.error("Error in sendAdminResetLink:", error);
    res.status(500).json({ status: false, message: "Internal server error." });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ status: false, message: 'Access denied' });
    }

    const users = await User.find().select('-password').populate('companyId', 'name'); ;

    if (!users.length) {
      return res.status(404).json({ status: false, message: 'No users found.' });
    }

    res.status(200).json({ status: true, users });
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: requesterId } = req.user;

    if (role !== 'admin' && id !== requesterId) {
      return res.status(403).json({ status: false, message: 'Access denied' });
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found.' });
    }

    res.status(200).json({ status: true, user });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

export const logoutUser = async (req, res) => {
    try {
        res.clearCookie("jwt", {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        });

        return res.status(200).json({
            status: true,
            message: "Logged out successfully.",
        });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({
            status: false,
            message: "Server error during logout.",
        });
    }
};