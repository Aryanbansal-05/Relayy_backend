import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // allows null/undefined values without breaking uniqueness
      required: true,
      match: [/^[0-9]{10}$/, "Invalid mobile number"], // Only allows 10-digit numbers
    },

    password: { type: String, required: true },
    college: { type: String, required: true, trim: true },
    hostel: { type: String, required: true, trim: true },
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    token: { type: String },
    sessionExpiry: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export { User };
