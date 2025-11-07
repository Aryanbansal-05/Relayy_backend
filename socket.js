import { Server } from "socket.io";
import { verifySocketToken } from "./middleware/authmiddleware.js";
import Chat from "./models/chat.model.js";

// Keep track of which user is in which socket room
const userSocketMap = new Map(); // { userId: socketId }

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://relayy-mu.vercel.app"
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    verifySocketToken(socket, next);
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id;
    console.log(`✅ User connected: ${userId}, Socket ID: ${socket.id}`);
    
    // Add user to the map
    userSocketMap.set(userId, socket.id);

    socket.on("join-chat", (chatId) => {
      socket.join(chatId);
      console.log(`User ${userId} joined chat room: ${chatId}`);
    });

    socket.on("leave-chat", (chatId) => {
      socket.leave(chatId);
      console.log(`User ${userId} left chat room: ${chatId}`);
    });

    socket.on("send-message", async (data) => {
    const { chatId, text, receiverId } = data;
    const senderId = socket.user._id;

    try {
    const message = {
    sender: senderId,
    text: text,
    timestamp: new Date(),
    };

    const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $push: { messages: message } },
    { new: true }
    )
      .populate("messages.sender", "username email");

    if (!updatedChat) {
    return socket.emit("chat-error", "Chat not found.");
    }

    const newMessage = updatedChat.messages[updatedChat.messages.length - 1];

    io.to(chatId).emit("receive-message", {
    chatId: chatId,
    message: newMessage,
    });

    const receiverSocketId = userSocketMap.get(receiverId);

    if (receiverSocketId) {
    const receiverSocket = io.sockets.sockets.get(receiverSocketId);
    const inSameRoom = receiverSocket && receiverSocket.rooms.has(chatId);

    if (!inSameRoom) {
    io.to(receiverSocketId).emit("new-message-notification", {
    chatId: chatId,
    senderName: socket.user.username,
    text: text,
    });
    console.log(`Sent new message notification to user ${receiverId}`);
    }
    }
      } catch (err) {
      console.error("Error sending message:", err);
    socket.emit("chat-error", "Failed to send message.");
    }
    });

    socket.on("delete-message", async (data) => {
      const { chatId, messageId } = data;
      const userId = socket.user._id;

      try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
          return socket.emit("chat-error", "Chat not found.");
        }

        if (!chat.participants.some((p) => p.toString() === userId.toString())) {
          return socket.emit("chat-error", "Not authorized.");
        }

        const messageIndex = chat.messages.findIndex(
          (msg) => msg._id.toString() === messageId
        );

        if (messageIndex === -1) {
          return socket.emit("chat-error", "Message not found.");
        }

        const message = chat.messages[messageIndex];
        if (message.sender.toString() !== userId.toString()) {
          return socket.emit("chat-error", "You can only delete your own messages.");
        }

        chat.messages.splice(messageIndex, 1);
        await chat.save();

        io.to(chatId).emit("message-deleted", {
          chatId: chatId,
          messageId: messageId,
        });

        console.log(`Message ${messageId} deleted in chat ${chatId}`);
      } catch (err) {
        console.error("Error deleting message:", err);
        socket.emit("chat-error", "Failed to delete message.");
      }
    });

    socket.on("delete-chat", async (data) => {
      const { chatId } = data;
      const userId = socket.user._id;

      try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
          return socket.emit("chat-error", "Chat not found.");
        }

        if (!chat.participants.some((p) => p.toString() === userId.toString())) {
          return socket.emit("chat-error", "Not authorized.");
        }

        await Chat.findByIdAndDelete(chatId);

        io.to(chatId).emit("chat-deleted", {
          chatId: chatId,
        });

        // Notify other participants
        chat.participants.forEach((participantId) => {
          if (participantId.toString() !== userId.toString()) {
            const participantSocketId = userSocketMap.get(participantId.toString());
            if (participantSocketId) {
              io.to(participantSocketId).emit("chat-deleted", {
                chatId: chatId,
              });
            }
          }
        });

        console.log(`Chat ${chatId} deleted`);
      } catch (err) {
        console.error("Error deleting chat:", err);
        socket.emit("chat-error", "Failed to delete chat.");
      }
    });

    socket.on("disconnect", () => {
      // Remove user from the map
      if (userSocketMap.get(userId) === socket.id) {
         userSocketMap.delete(userId);
      }
      console.log(`❌ User disconnected: ${userId}, Socket ID: ${socket.id}`);
    });
  });
};

