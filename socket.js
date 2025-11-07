import { Server } from "socket.io";
import { verifySocketToken } from "./middleware/authmiddleware.js";
import Chat from "./models/Chat.model.js";

const userSocketMap = new Map();

export const initializeSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://relayy-mu.vercel.app",
    "https://relayy.shop",
    "https://www.relayy.shop",
  ];

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else {
          console.warn("❌ [Socket.io] Blocked by CORS:", origin);
          callback(new Error("Not allowed by Socket.io CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      verifySocketToken(socket, next);
    } catch (err) {
      console.error("❌ Socket authentication failed:", err.message);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user?._id;
    if (!userId) return socket.disconnect();

    console.log(`✅ User connected: ${userId}, Socket ID: ${socket.id}`);
    userSocketMap.set(userId.toString(), socket.id);

    socket.on("join-chat", (chatId) => chatId && socket.join(chatId));
    socket.on("leave-chat", (chatId) => chatId && socket.leave(chatId));

    socket.on("send-message", async (data) => {
      const { chatId, text, receiverId } = data;
      const senderId = socket.user._id;

      if (!chatId || !text || !receiverId)
        return socket.emit("chat-error", "Invalid message data.");

      try {
        const message = { sender: senderId, text: text.trim(), timestamp: new Date() };

        const updatedChat = await Chat.findByIdAndUpdate(
          chatId,
          { $push: { messages: message } },
          { new: true }
        ).populate("messages.sender", "username email");

        if (!updatedChat) return socket.emit("chat-error", "Chat not found.");

        const newMessage = updatedChat.messages[updatedChat.messages.length - 1];
        io.to(chatId).emit("receive-message", { chatId, message: newMessage });

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
          }
        }
      } catch (err) {
        console.error("❌ Error sending message:", err);
        socket.emit("chat-error", "Failed to send message.");
      }
    });

    socket.on("delete-message", async ({ chatId, messageId }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return socket.emit("chat-error", "Chat not found.");

        const messageIndex = chat.messages.findIndex(
          (msg) => msg._id.toString() === messageId
        );
        if (messageIndex === -1)
          return socket.emit("chat-error", "Message not found.");

        if (chat.messages[messageIndex].sender.toString() !== userId.toString())
          return socket.emit("chat-error", "You can only delete your own messages.");

        chat.messages.splice(messageIndex, 1);
        await chat.save();

        io.to(chatId).emit("message-deleted", { chatId, messageId });
      } catch (err) {
        console.error("❌ Error deleting message:", err);
        socket.emit("chat-error", "Failed to delete message.");
      }
    });

    socket.on("delete-chat", async ({ chatId }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return socket.emit("chat-error", "Chat not found.");
        const authorized = chat.participants.some(
          (p) => p.toString() === userId.toString()
        );
        if (!authorized) return socket.emit("chat-error", "Not authorized.");

        await Chat.findByIdAndDelete(chatId);
        io.to(chatId).emit("chat-deleted", { chatId });

        chat.participants.forEach((participantId) => {
          const socketId = userSocketMap.get(participantId.toString());
          if (socketId) io.to(socketId).emit("chat-deleted", { chatId });
        });
      } catch (err) {
        console.error("❌ Error deleting chat:", err);
        socket.emit("chat-error", "Failed to delete chat.");
      }
    });

    socket.on("disconnect", () => {
      if (userSocketMap.get(userId.toString()) === socket.id)
        userSocketMap.delete(userId.toString());
      console.log(`❌ User disconnected: ${userId}`);
    });
  });

  return io;
};
