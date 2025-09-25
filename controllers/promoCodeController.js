import PromoCode from "../models/promoCodeModel.js";
import PromoCodeUsage from "../models/PromoCodeUsage.js";
import Order from "../models/orderModel.js";
import { updateExpiredPromoCodes } from '../utils/cronJobs.js';

export const getPromoCodesByCompanyId = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const promoCodes = await PromoCode.find({ companyId })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            status: true,
            message: "Promo codes fetched successfully",
            promoCodes
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Error fetching promo codes",
            error: error.message
        });
    }
};

export const createPromoCode = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                status: false,
                message: "Only admin can create promo code."
            });
        }

        const {
            code,
            discountAmount,
            discountType,
            description,
            expiresAt,
            isActive
        } = req.body;

        const existing = await PromoCode.findOne({ code, companyId: req.user.companyId });
        if (existing) {
            return res.status(400).json({
                status: false,
                message: "Promo code already exists for this company."
            });
        }

        let computedIsActive = isActive !== undefined ? isActive : true;
        if (expiresAt && new Date(expiresAt) <= new Date()) {
            computedIsActive = false;
        }

        const promo = await PromoCode.create({
            code,
            discountAmount,
            discountType,
            description,
            expiresAt,
            isActive: computedIsActive,
            createdBy: req.user.id,
            companyId: req.user.companyId
        });

        return res.status(200).json({
            status: true,
            message: "Promo code created successfully.",
            promoCode: promo
        });

    } catch (error) {
        console.error("Error creating promo code:", error);
        return res.status(500).json({
            status: false,
            message: "Server error while creating promo code."
        });
    }
};

export const updatePromoCode = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: false,
        message: "Only admin can update promo code.",
      });
    }

    const { id } = req.params;
    const { code, discountAmount, discountType, description, expiresAt, isActive } = req.body;

    const promo = await PromoCode.findById(id);
    if (!promo) {
      return res.status(404).json({
        status: false,
        message: "Promo code not found.",
      });
    }

    if (code && code !== promo.code) {
      const existing = await PromoCode.findOne({ code });
      if (existing) {
        return res.status(400).json({
          status: false,
          message: "Promo code with this code already exists.",
        });
      }
    }

    if (code !== undefined) promo.code = code;
    if (discountAmount !== undefined) promo.discountAmount = discountAmount;
    if (discountType !== undefined) promo.discountType = discountType;
    if (description !== undefined) promo.description = description;
    if (expiresAt !== undefined) promo.expiresAt = expiresAt;
    if (isActive !== undefined) promo.isActive = isActive;

    if (promo.expiresAt && new Date() > promo.expiresAt) {
      promo.isActive = false;
    }

    await promo.save();

    res.status(200).json({
      status: true,
      message: "Promo code updated successfully.",
      Promocode: promo,
    });
  } catch (error) {
    console.error("Error updating promo code:", error);
    res.status(500).json({
      status: false,
      message: "Server error.",
    });
  }
};

export const applyPromoCode = async (req, res) => {
    try {
        const { code, originalAmount, orderId } = req.body;
        const userId = req.user?.id;
        
        if (!orderId) {
            return res.status(400).json({
                status: false,
                message: "Order ID is required."
            });
        }

        if (!userId) {
            return res.status(401).json({
                status: false,
                message: "User not authenticated."
            });
        }

        const promo = await PromoCode.findOne({ code, isActive: true });

        if (!promo) {
            return res.status(404).json({
                status: false,
                message: "Promo code not found or inactive."
            });
        }

        if (promo.expiresAt && new Date() > promo.expiresAt) {
            if (promo.isActive) {
                promo.isActive = false;
                await promo.save();
            }
            return res.status(400).json({
                status: false,
                message: "Promo code expired."
            });
        }

        const alreadyUsed = await PromoCodeUsage.findOne({ userId, promoCode: promo._id });

        if (alreadyUsed) {
            return res.status(400).json({
                status: false,
                message: "You have already used this promo code."
            });
        }

        let discount = 0;

        if (promo.discountType === "flat") {
            discount = promo.discountAmount;
        } else if (promo.discountType === "percent") {
            discount = (originalAmount * promo.discountAmount) / 100;
        }

        const finalAmount = Math.max(originalAmount - discount, 0);

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found."
            });
        }

        if (order.paymentStatus !== "Pending") {
            return res.status(400).json({
                status: false,
                message: "Promo code can only be applied to pending orders."
            });
        }

        if (order.totalAmount !== originalAmount) {
            return res.status(400).json({
                status: false,
                message: "Order amount mismatch. Please refresh and try again."
            });
        }

        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                status: false,
                message: "You are not authorized to modify this order."
            });
        }

        order.totalAmount = finalAmount;
        await order.save();

        await PromoCodeUsage.create({
            userId,
            promoCode: promo._id,
            usedAt: new Date()
        });

        res.status(200).json({
            status: true,
            message: "Promo code applied.",
            discountAmount: discount,
            discountType: promo.discountType,
            finalAmount,
            description: promo.description
        });

    } catch (error) {
        console.error("Error applying promo code:", error);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
};

export const getAllPromoCodes = async (req, res) => {
    try {
        await updateExpiredPromoCodes();
        
        const promoCodes = await PromoCode.find();
        
        res.status(200).json({
            status: true,
            message: "All promo codes fetched successfully.",
            Promocodes: promoCodes
        });
    } catch (error) {
        console.error("Error fetching promo codes:", error);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
};

// export const getAllPromoCodes = async (req, res) => {
//   try {
//     const currentDate = new Date();

//     const promoCodes = await PromoCode.find({
//       $or: [
//         { expiresAt: { $gt: currentDate } },
//         { expiresAt: null }
//       ]
//     }); 

//     res.status(200).json({
//       status: true,
//       message: "All active promo codes fetched successfully.",
//       promoCodes: promoCodes
//     });
//   } catch (error) {
//     console.error("Error fetching promo codes:", error);
//     res.status(500).json({
//       status: false,
//       message: "Server error"
//     });
//   }
// };

export const getActiveCodes = async (req,res) =>{
  try{
    const currentDate = new Date();

    const promoCodes = await PromoCode.find({
      isActive: true,
      $or:[
        {expiresAt: { $gt: currentDate}},
        {expiresAt: null}
      ]
    });
    res.status(200).json({
      status:true,
      message:"All active promo codes fetched successfully.!",
      promoCodes: promoCodes
    })
  } catch(error){
    console.log("Error fetching promo codes:", error)
    res.status(500).json({
      status:false,
      message:"Server Error"
    })
  }
}

export const getPromoCodeById = async (req, res) => {
    try {
        const { id } = req.params;
        const promo = await PromoCode.findById(id);

        if (!promo) {
            return res.status(404).json({
                status: false,
                message: "Promo code not found."
            });
        }

        res.status(200).json({
            status: true,
            message: "Promo code fetched successfully.",
            Promocode: promo
        });
    } catch (error) {
        console.error("Error fetching promo code by ID:", error);
        res.status(500).json({
            status: false,
            message: "Server error"
        });
    }
};

export const setPromoCodeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ status: false, message: "`isActive` must be a boolean." });
    }

    const promo = await PromoCode.findById(id);
    if (!promo) {
      return res.status(404).json({ status: false, message: "Promo code not found." });
    }

    promo.isActive = isActive;
    await promo.save();

    res.status(200).json({
      status: true,
      message: `Promo code ${isActive ? 'activated' : 'deactivated'} successfully`,
      Promocode: promo,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }
};


export const deletePromoCode = async (req, res) => {
  try {
    const { id } = req.params;

    const promo = await PromoCode.findByIdAndDelete(id);
    if (!promo) {
      return res.status(404).json({ status: false, message: "Promo code not found." });
    }

    res.status(200).json({
      status: true,
      message: "Promo code deleted successfully",
      Promocode: promo,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }
};
