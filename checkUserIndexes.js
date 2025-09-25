import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
});

const User = mongoose.model("User", userSchema, "users");

async function checkIndexes() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const indexes = await User.collection.getIndexes();
  console.log("Indexes on users collection:", indexes);
  await mongoose.disconnect();
}

checkIndexes();
