import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true },
    description: { type: String },
    view: { type: String, enum: ["public", "private"], required: true },
    image: { type: String },
    quantity: { type: Number },
    dateTime: { type: Date },
    location: { type: String },
    tickets: [
      {
        ticketName: { type: String },
        description: { type: String },
        price: { type: Number },
        quantity: { type: Number },
      },
    ],
    faqs: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
      },
      { _id: true } 
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
