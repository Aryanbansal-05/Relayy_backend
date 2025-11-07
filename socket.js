import { Server } from "socket.io";
import { verifySocketToken } from "./middleware/authmiddleware.js";
import Chat from "./models/chat.model.js";

// Track which socket belongs to which user
const userSocketMap = new Map(); // { userId: socketId }

export const initializeSocket = (server) => {
  // ✅ Same origins as Express server CORS config
  const allowedOrigins = [
    "http://localhost:5173",
    "https://relayy-mu.vercel.app",
    "https://relayy.shop",
    "https://www.relayy.shop",
  ];

  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn("❌ [Socket.io] Blocked by CORS:", origin);
          callback(new Error("Not allowed by Socket.io CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    },
  });

  // ✅ Token Verification Middleware
  io.use((socket, next) => {
    try {
      verifySocketToken(socket, next);
    } catch (err) {
      console.error("❌ Socket authentication failed:", err.message);
      next(new Error("Authentication failed"));
    }
  });

  // ✅ Connection Event
  io.on("connection", (socket) => {
    const userId = socket.user?._id;

    if (!userId) {
      console.warn("⚠️ Connection attempt without valid user ID.");
      socket.disconnect();
      return;
    }

    console.log(`✅ User connected: ${userId}, Socket ID: ${socket.id}`);
    userSocketMap.set(userId.toString(), socket.id);

    // --- JOIN CHAT ROOM ---
    socket.on("join-chat", (chatId) => {
      if (chatId) {
        socket.join(chatId);
        console.log(`👥 User ${userId} joined chat room: ${chatId}`);
      }
    });

    // --- LEAVE CHAT ROOM ---
    socket.on("leave-chat", (chatId) => {
      if (chatId) {
        socket.leave(chatId);
        console.log(`👋 User ${userId} left chat room: ${chatId}`);
      }
    });

    // --- SEND MESSAGE ---
    socket.on("send-message", async (data) => {
      const { chatId, text, receiverId } = data;
      const senderId = socket.user._id;

      if (!chatId || !text || !receiverId) {
        console.warn("⚠️ Invalid message payload:", data);
        return socket.emit("chat-error", "Invalid message data.");
      }

      try {
        const message = {
          sender: senderId,
          text: text.trim(),
          timestamp: new Date(),
        };

        const updatedChat = await Chat.findByIdAndUpdate(
          chatId,
          { $push: { messages: message } },
          { new: true }
        ).populate("messages.sender", "username email");

        if (!updatedChat) {
          return socket.emit("chat-error", "Chat not found.");
        }

        const newMessage = updatedChat.messages[updatedChat.messages.length - 1];

        // Broadcast message to all users in this chat
        io.to(chatId).emit("receive-message", {
          chatId,
          message: newMessage,
        });

        // 🔔 Notify receiver if not in same chat room
        const receiverSocketId = userSocketMap.get(receiverId.toString());
        if (receiverSocketId) {
          const receiverSocket = io.sockets.sockets.get(receiverSocketId);
          const isInSameRoom = receiverSocket && receiverSocket.rooms.has(chatId);

          if (!isInSameRoom) {
            io.to(receiverSocketId).emit("new-message-notification", {
              chatId,
              senderName: socket.user.username,
              text,
            });
            console.log(`🔔 Sent new message notification to user ${receiverId}`);
          }
        }
      } catch (err) {
        console.error("❌ Error sending message:", err);
        socket.emit("chat-error", "Failed to send message.");
      }
    });

    // --- DELETE MESSAGE ---
    socket.on("delete-message", async (data) => {
      const { chatId, messageId } = data;
      const userId = socket.user._id;

      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return socket.emit("chat-error", "Chat not found.");

        const messageIndex = chat.messages.findIndex(
          (msg) => msg._id.toString() === messageId
        );
        if (messageIndex === -1) return socket.emit("chat-error", "Message not found.");

        const message = chat.messages[messageIndex];
        if (message.sender.toString() !== userId.toString()) {
          return socket.emit("chat-error", "You can only delete your own messages.");
        }

        chat.messages.splice(messageIndex, 1);
        await chat.save();

        io.to(chatId).emit("message-deleted", { chatId, messageId });
        console.log(`🗑 Message ${messageId} deleted in chat ${chatId}`);
      } catch (err) {
        console.error("❌ Error deleting message:", err);
        socket.emit("chat-error", "Failed to delete message.");
      }
    });

    // --- DELETE ENTIRE CHAT ---
    socket.on("delete-chat", async (data) => {
      const { chatId } = data;
      const userId = socket.user._id;

      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return socket.emit("chat-error", "Chat not found.");

        const authorized = chat.participants.some(
          (p) => p.toString() === userId.toString()
        );
        if (!authorized) return socket.emit("chat-error", "Not authorized.");

        await Chat.findByIdAndDelete(chatId);
        io.to(chatId).emit("chat-deleted", { chatId });

        // Notify other participants
        chat.participants.forEach((participantId) => {
          const socketId = userSocketMap.get(participantId.toString());
          if (socketId) io.to(socketId).emit("chat-deleted", { chatId });
        });

        console.log(`💬 Chat ${chatId} deleted successfully`);
      } catch (err) {
        console.error("❌ Error deleting chat:", err);
        socket.emit("chat-error", "Failed to delete chat.");
      }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
      const mappedSocket = userSocketMap.get(userId.toString());
      if (mappedSocket === socket.id) {
        userSocketMap.delete(userId.toString());
      }
      console.log(`❌ User disconnected: ${userId}, Socket ID: ${socket.id}`);
    });
  });

  return io;
};
