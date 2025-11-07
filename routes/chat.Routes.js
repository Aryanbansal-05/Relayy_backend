import { Router } from "express";
import {
  createOrGetChat,
  getChatById,
  getAllUserChats,
  sendMessage,
  getChatMessages,
  deleteMessage,
  markMessagesAsRead,
  deleteChat,
} from "../controllers/chat.controller.js";
import { protect } from "../middleware/authmiddleware.js";

const router = Router();

router.post("/", protect, createOrGetChat);
router.get("/", protect, getAllUserChats);
router.get("/:chatId", protect, getChatById);
router.delete("/:chatId", protect, deleteChat);
router.post("/:chatId/messages", protect, sendMessage);
router.get("/:chatId/messages", protect, getChatMessages);
router.delete("/:chatId/messages/:messageId", protect, deleteMessage);
router.put("/:chatId/read", protect, markMessagesAsRead);

export default router;
