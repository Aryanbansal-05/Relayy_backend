// backend/CloudConfig.js
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config(); // ✅ Load environment variables

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Verify credentials on startup (helps debug .env issues)
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error("❌ Missing CLOUDINARY_CLOUD_NAME in .env");
}
if (!process.env.CLOUDINARY_API_KEY) {
  console.error("❌ Missing CLOUDINARY_API_KEY in .env");
}
if (!process.env.CLOUDINARY_API_SECRET) {
  console.error("❌ Missing CLOUDINARY_API_SECRET in .env");
}

// ✅ Configure Cloudinary Storage for multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    try {
      return {
        folder: "relay_products", // your folder name in Cloudinary
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        resource_type: "image",
        transformation: [{ width: 1200, height: 1200, crop: "limit" }], // optional
      };
    } catch (error) {
      console.error("❌ Cloudinary storage config error:", error);
      throw error;
    }
  },
});

// ✅ Create multer instance
export const upload = multer({ storage });

// ✅ Export Cloudinary for direct usage if needed elsewhere
export { cloudinary };
