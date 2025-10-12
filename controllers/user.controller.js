import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs"; // Use bcryptjs to avoid node-gyp issues
import jwt from "jsonwebtoken";
import httpStatus from "http-status";

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(httpStatus.BAD_REQUEST).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser)
      return res.status(httpStatus.CONFLICT).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, email, password: hashedPassword });

    res.status(httpStatus.CREATED).json({ message: "User registered successfully" });
  } catch (e) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: e.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide username and password" });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(httpStatus.OK).json({
      message: "Login successful",
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (e) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: e.message });
  }
};

export { register, login };
