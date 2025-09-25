import UserProfile from "../models/userProfile.js";

export const createUserProfile = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ status: false, message: "Please upload an image." });
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ status: false, message: "Only JPEG, JPG, and PNG files are allowed." });
    }

    const base64Image = Buffer.from(req.file.buffer).toString("base64");
    const imageData = `data:${req.file.mimetype};base64,${base64Image}`;

    const existingProfile = await UserProfile.findOne({ userId });
    if (existingProfile) {
      return res.status(400).json({ status: false, message: "Profile already exists for this user." });
    }

    const newProfile = new UserProfile({
      userId,
      profileImage: imageData,
    });

    await newProfile.save();
    return res.status(201).json({ status: true, message: "Profile created successfully.", profile: newProfile });

  } catch (error) {
    console.error("Error creating profile:", error);
    return res.status(500).json({ status: false, message: "Server error while creating profile." });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ status: false, message: "Please upload an image." });
    }

    const base64Image = req.file.buffer.toString("base64");

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ status: false, message: "Profile not found." });
    }

    profile.profileImage = `data:${req.file.mimetype};base64,${base64Image}`;
    await profile.save();

    return res.status(200).json({ status: true, message: "Profile updated successfully.", profile });

  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ status: false, message: "Server error while updating profile." });
  }
};

export const deleteUserProfile = async (req, res) => {
  try {
    const { userId } = req.body;

    const profile = await UserProfile.findOneAndDelete({ userId });
    if (!profile) {
      return res.status(404).json({ status: false, message: "Profile not found." });
    }

    return res.status(200).json({ status: true, message: "Profile deleted successfully." });

  } catch (error) {
    console.error("Error deleting profile:", error);
    return res.status(500).json({ status: false, message: "Server error while deleting profile." });
  }
};
