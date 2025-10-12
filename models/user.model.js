import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  token: { type: String },
  otp: { type: String },
  isVerified: { type: Boolean, default: false }},
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export { User };
