import mongoose from "mongoose";

const promoCodeUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    promoCode: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PromoCode",
        required: true
    },
    usedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("PromoCodeUsage", promoCodeUsageSchema);
