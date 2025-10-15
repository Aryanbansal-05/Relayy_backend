import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    college: { type: String, required: true, trim: true },
    hostel: { type: String, required: true, trim: true },
    token: { type: String },
    otp: { type: String },
    isVerified: { type: Boolean, default: false },
    sessionExpiry: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export { User };
