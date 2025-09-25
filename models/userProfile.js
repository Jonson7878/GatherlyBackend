import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: "User" },
  profileImage: {type: String,  required: true },
} , { timestamps: true });

const UserProfile = mongoose.model("UserProfile", userProfileSchema);
export default UserProfile;
