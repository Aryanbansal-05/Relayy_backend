import Chat from "../models/chat.model.js";
import { User } from "../models/user.model.js";
import httpStatus from "http-status";

export const createOrGetChat = async (req, res) => {
  try {
    const { receiverId, productId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Receiver ID is required" });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Cannot create chat with yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "Receiver not found" });
    }

    const receiverObjId = receiver._id;
    let productObjId = null;
    if (productId) {
      try {
        productObjId = new mongoose.Types.ObjectId(productId);
      } catch (err) {
        // Invalid productId, treat as no product
        productObjId = null;
      }
    }

    let query = {
      participants: { $all: [senderId, receiverObjId] },
    };

    if (productObjId) {
      query.product = productObjId;
    } else {
      query.product = { $exists: false };
    }

    let chat = await Chat.findOne(query)
      .populate("buyer", "username email")
      .populate("seller", "username email")
      .populate("product", "title imageUrls price")
      .populate("messages.sender", "username email");

    if (!chat) {
      chat = await Chat.create({
        participants: [senderId, receiverObjId],
        buyer: senderId,
        seller: receiverObjId,
        product: productObjId || undefined,
        messages: [],
      });

      chat = await Chat.findById(chat._id)
        .populate("buyer", "username email")
        .populate("seller", "username email")
        .populate("product", "title imageUrls price")
        .populate("messages.sender", "username email");
    }

    res.status(httpStatus.OK).json(chat);
  } catch (err) {
    console.error("Error creating/getting chat:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error", error: err.message });
  }
};

export const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate("buyer", "username email")
      .populate("seller", "username email")
      .populate("product", "title imageUrls price")
      .populate("messages.sender", "username email");

    if (!chat) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "Chat not found" });
    }

    if (!chat.participants.some(p => p.toString() === userId.toString())) {
      return res.status(httpStatus.FORBIDDEN).json({ message: "Not authorized to view this chat" });
    }

    res.status(httpStatus.OK).json(chat);
  } catch (err) {
    console.error("Error fetching chat:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error", error: err.message });
  }
};

export const getAllUserChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: userId,
    })
      .populate("buyer", "username email")
      .populate("seller", "username email")
      .populate("product", "title imageUrls price")
      .populate("messages.sender", "username email")
      .sort({ updatedAt: -1 });

    res.status(httpStatus.OK).json(chats);
  } catch (err) {
    console.error("Error fetching user chats:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error", error: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    const senderId = req.user._id;

    if (!text || text.trim() === "") {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Message text is required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "Chat not found" });
    }

    if (!chat.participants.some(p => p.toString() === senderId.toString())) {
      return res.status(httpStatus.FORBIDDEN).json({ message: "Not authorized to send messages in this chat" });
    }

    const message = {
      sender: senderId,
      text: text.trim(),
      timestamp: new Date(),
    };

    chat.messages.push(message);
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate("messages.sender", "username email");

    const newMessage = updatedChat.messages[updatedChat.messages.length - 1];

    res.status(httpStatus.CREATED).json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error", error: err.message });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate("messages.sender", "username email");

    if (!chat) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "Chat not found" });
    }

    if (!chat.participants.some(p => p.toString() === userId.toString())) {
      return res.status(httpStatus.FORBIDDEN).json({ message: "Not authorized to view messages" });
    }

    res.status(httpStatus.OK).json(chat.messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error", error: err.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "Chat not found" });
    }

    if (!chat.participants.some(p => p.toString() === userId.toString())) {
      return res.status(httpStatus.FORBIDDEN).json({ message: "Not authorized" });
    }

    const messageIndex = chat.messages.findIndex(msg => msg._id.toString() === messageId);
    
    if (messageIndex === -1) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "Message not found" });
    }

    const message = chat.messages[messageIndex];
    if (message.sender.toString() !== userId.toString()) {
      return res.status(httpStatus.FORBIDDEN).json({ message: "You can only delete your own messages" });
    }

    chat.messages.splice(messageIndex, 1);
    await chat.save();

    res.status(httpStatus.OK).json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error", error: err.message });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "Chat not found" });
    }

    if (!chat.participants.some(p => p.toString() === userId.toString())) {
      return res.status(httpStatus.FORBIDDEN).json({ message: "Not authorized" });
    }

    let updated = false;
    chat.messages.forEach(msg => {
      if (msg.sender.toString() !== userId.toString() && !msg.read) {
        msg.read = true;
        updated = true;
      }
    });

    if (updated) {
      await chat.save();
    }

    res.status(httpStatus.OK).json({ message: "Messages marked as read" });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error", error: err.message });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "Chat not found" });
    }

    if (!chat.participants.some(p => p.toString() === userId.toString())) {
      return res.status(httpStatus.FORBIDDEN).json({ message: "Not authorized to delete this chat" });
    }

    await Chat.findByIdAndDelete(chatId);

    res.status(httpStatus.OK).json({ message: "Chat deleted successfully" });
  } catch (err) {
    console.error("Error deleting chat:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Server error", error: err.message });
  }
};
