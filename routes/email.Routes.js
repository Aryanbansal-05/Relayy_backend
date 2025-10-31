import express from "express";
import { sendOfferEmail } from "../utils/sendOfferEmail.js";
import Product from "../models/Product.model.js";
import { User } from "../models/user.model.js";

const router = express.Router();

router.post("/send-offer", async (req, res) => {
  try {
    const { productId, buyerId, offerAmount, message } = req.body;

    // 1️⃣ Fetch product info
    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    // 2️⃣ Fetch buyer info
    const buyer = await User.findById(buyerId);
    if (!buyer)
      return res.status(404).json({ success: false, message: "Buyer not found" });

    // Extract data
    const sellerEmail = product.userEmail;
    const productName = product.title;
    const productImage = product.imageUrls?.[0] || null;
    const buyerName = buyer.username || buyer.name;
    const buyerEmail = buyer.email;

    // 3️⃣ Send email
    await sendOfferEmail({
      sellerEmail,
      productName,
      buyerName,
      buyerEmail,
      offerAmount,
      message,
      productImage,
    });

    res.status(200).json({ success: true, message: "Offer email sent successfully!" });
  } catch (error) {
    console.error("❌ Offer route error:", error.message);
    res.status(500).json({ success: false, message: "Failed to send offer email." });
  }
});

export default router;
