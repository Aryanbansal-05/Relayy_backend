import { Router } from "express";
import { signup, login, logout, verifyUser } from "../controllers/user.controller.js"; // ✅ renamed to match improved controller
import { User } from "../models/user.model.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify", verifyUser);
// Example: routes/userRoutes.js
router.get("/:email", async (req, res) => {
  const user = await User.findOne({ email: req.params.email });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

export default router;
