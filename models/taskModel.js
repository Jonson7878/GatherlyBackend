import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  description: { type: String },
  assignBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  priority: { type: String, enum: ["high", "medium", "low", "critical"], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCompleted: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Task", taskSchema);
