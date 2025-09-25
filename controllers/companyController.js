import bcrypt from "bcryptjs";
import Company from "../models/companyModel.js";
import User from "../models/userModel.js";
import Event from "../models/eventModel.js";
import Order from "../models/orderModel.js";
import PromoCode from "../models/promoCodeModel.js";    
import { validateCompany } from "../validation/company-validation.js";
import { validateUserRegistration } from "../validation/user-validation.js";
import { passwordValidator } from "../utils/validator.js";

export const createCompany = async (req, res) => {
    const { error } = validateCompany(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { name, type, description, userId } = req.body;

    try {
        const existingCompany = await Company.findOne({ name });
        if (existingCompany) {
            return res.status(400).json({ status: false, message: "Company already registered" });
        }

        const company = new Company({
            name,
            type,
            description,
        });

        await company.save();

        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                user.companyId = company._id;
                await user.save();
                console.log(`User with ID ${userId} is linked to company ${company._id}`);
            } else {
                console.log("User not found");
            }
        }

            res.status(201).json({
            status: true,
            message: "Company created successfully",
            company,
        });
    } catch (error) {
        console.error("Error creating company:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const registerUser = async (req, res) => {
    const { error } = validateUserRegistration(req.body);
    if (error) {
        return res.status(400).json({ status: false, message: error.details[0].message });
    }

    const { username, email, password, confirmPassword, companyId } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ status: false, message: "User already registered" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ status: false, message: "Passwords do not match" });
        }

        if (!passwordValidator(password)) {
            return res.status(400).json({
                status: false,
                message: "Password must be 8-16 characters long, include at least one uppercase letter, one lowercase letter, one number, and one symbol (@, #, !, %, ^)",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            email,
            password: hashedPassword,
            companyId,
            role: "admin",
        });

        await user.save();

        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        res.status(201).json({ status: true, message: "User registered successfully", user: userWithoutPassword });

    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

export const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find({});
    res.status(200).json({ status: true, companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const deleteCompanyAndData = async (req, res) => {
  const { companyId } = req.params;
  const user = req.user;

  try {
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized: No user info" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Access denied: Admins only" });
    }

    if (!user.companyId || user.companyId.toString() !== companyId) {
      return res.status(403).json({ status: false, message: "You can delete only your own company" });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ status: false, message: "Company not found" });
    }

    const users = await User.find({ companyId });
    const userIds = users.map(u => u._id);
    
    const events = await Event.find({ createdBy: { $in: userIds } });
    const orders = await Order.find({ companyId });
    const promoCodes = await PromoCode.find({ companyId });

    await User.deleteMany({ companyId });
    await Event.deleteMany({ createdBy: { $in: userIds } });
    await Order.deleteMany({ companyId });
    await PromoCode.deleteMany({ companyId });
    await Company.findByIdAndDelete(companyId);

    return res.status(200).json({
      status: true,
      message: "Company and all related data deleted successfully",
      deletedData: {
        company,
        users,
        events,
        orders,
        promoCodes,
      },
    });
  } catch (error) {
    console.error("Error deleting company and related data:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};
export const updateCompany = async (req, res) => {
  const { name, type, description } = req.body;
  const { companyId } = req.params;
  const user = req.user;

  try {
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized: No user info" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Access denied: Admins only" });
    }

    if (!companyId) {
      return res.status(400).json({ status: false, message: "Company ID is required" });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ status: false, message: "Company not found" });
    }

    if (name && name !== company.name) {
      const existingCompany = await Company.findOne({ name });
      if (existingCompany) {
        return res.status(400).json({ status: false, message: "Company name already in use" });
      }
    }

    const oldName = company.name;

    if (name) company.name = name;
    if (type) company.type = type;
    if (description) company.description = description;

    await company.save();

    if (name && name !== oldName) {
      await User.updateMany({ companyId }, { companyName: name });
      await Event.updateMany({ companyId }, { companyName: name });
      await Order.updateMany({ companyId }, { companyName: name });
      await PromoCode.updateMany({ companyId }, { companyName: name });
    }

    res.status(200).json({
      status: true,
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getCompanyById = async (req, res) => {
    try {
      const companyId = req.user.companyId;
  
      if (!companyId) {
        return res.status(400).json({ status: false, message: "Company ID not found in token" });
      }
  
      const company = await Company.findById(companyId);
  
      if (!company) {
        return res.status(404).json({ status: false, message: "Company not found" });
      }
  
      res.status(200).json({ status: true, company });
    } catch (error) {
      console.error("Error fetching company details:", error);
      res.status(500).json({ status: false, message: "Internal server error" });
    }
  };
  