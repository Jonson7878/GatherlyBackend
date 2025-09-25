import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "employee", "guest"], default: "guest" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company"},
    twoFactorSecret: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
});

export default mongoose.model("User", userSchema);