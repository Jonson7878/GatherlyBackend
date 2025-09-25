import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true
        },
        discountAmount: {
            type: Number,
            required: true
        },
        discountType: {
            type: String,
            enum: ["flat", "percent"],
        },
        description: {
            type: String,
            trim: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        companyId: { 
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company" 
        },
        expiresAt: {
            type: Date
        },
        isActive: {
            type: Boolean, 
            default: true
        }
    }
);

export default mongoose.model("PromoCode", promoCodeSchema);
