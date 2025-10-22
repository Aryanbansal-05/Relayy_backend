// backend/routes/product.routes.js
import express from "express";
import Product from "../models/Product.model.js";
import { upload } from "../CloudConfig.js";
import { protect } from "../middleware/authmiddleware.js";
import multer from "multer";
const Productrouter = express.Router();
const up = multer({ dest: "uploads/" }); // simple local storage

/* ---------------------------------------------
   ✅ CREATE PRODUCT (with up to 4 Cloudinary images)
---------------------------------------------- */
// backend/routes/product.routes.js
Productrouter.post("/", protect, upload.array("images", 4), async (req, res) => {
  try {
    console.log("\n=== 🟢 Incoming product upload ===");
    console.log("Headers:", req.headers);
    console.log("Body keys:", Object.keys(req.body));
    console.log("Files received:", req.files?.length || 0);
    console.log("User:", req.user);

    const { title, price, category, description } = req.body;

    if (!req.files || req.files.length === 0) {
      console.log("❌ No files uploaded!");
      return res.status(400).json({ message: "No images uploaded" });
    }

    const imageUrls = req.files.map((file) => file.path);

    const product = await Product.create({
      title,
      price,
      category,
      description,
      imageUrls,
      userId: req.user._id,
      username: req.user.username,
      userEmail: req.user.email,
    });

    console.log("✅ Product created successfully:", product._id);

    res.status(201).json({
      success: true,
      message: "Product created successfully!",
      product,
    });
  } catch (err) {
    console.error("❌ Product upload error (backend):", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});


/* ---------------------------------------------
   ✅ GET ALL PRODUCTS
---------------------------------------------- */
Productrouter.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   ✅ GET LOGGED-IN USER’S PRODUCTS
---------------------------------------------- */
Productrouter.get("/my", protect, async (req, res) => {
  try {
    const myProducts = await Product.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(myProducts);
  } catch (err) {
    console.error("❌ Error fetching user products:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   ✅ GET SINGLE PRODUCT BY ID
---------------------------------------------- */
Productrouter.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   ✅ UPDATE PRODUCT
---------------------------------------------- */
Productrouter.put("/:id", protect, upload.array("images", 4), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    if (product.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this ad" });
    }

    product.title = req.body.title || product.title;
    product.price = req.body.price || product.price;
    product.category = req.body.category || product.category;
    product.description = req.body.description || product.description;

    if (req.files && req.files.length > 0) {
      product.imageUrls = req.files.map((file) => file.path);
    }

    await product.save();
    res.json({ success: true, message: "Product updated successfully!", product });
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   ✅ DELETE PRODUCT
---------------------------------------------- */
Productrouter.delete("/:id", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    if (product.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this ad" });
    }

    await product.deleteOne();
    res.json({ success: true, message: "Product deleted successfully!" });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   ✅ GET PRODUCTS BY COLLEGE DOMAIN
---------------------------------------------- */
Productrouter.get("/college/:domain", async (req, res) => {
  try {
    const domain = req.params.domain;
    console.log("🎓 Requested domain:", domain);

    if (!domain) {
      return res.status(400).json({ message: "No domain provided" });
    }

    const collegeProducts = await Product.find({
      userEmail: { $regex: new RegExp(`@${domain}$`, "i") },
    }).sort({ createdAt: -1 });

    console.log("✅ Found products:", collegeProducts.length);
    res.status(200).json(collegeProducts);
  } catch (err) {
    console.error("❌ Error fetching college products:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});



Productrouter.post("/test", up.array("images", 4), async (req, res) => {
  console.log("🟢 Body:", req.body);
  console.log("🟢 Files:", req.files);
  res.json({ body: req.body, files: req.files });
});

export default Productrouter;
