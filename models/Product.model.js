import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String },
    imageUrls: [{ type: String, required: true }],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    userEmail: { type: String, required: true },
    userHostel: { type: String, required: true },
    isSold: { type: Boolean, default: false },
    soldAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
