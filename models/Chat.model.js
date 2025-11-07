import mongoose from 'mongoose';

/**
 * Represents a single chat message
 */
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

/**
 * Represents a single chat conversation between users about a specific product.
 */
const chatSchema = new mongoose.Schema({
  // An array containing the ObjectIds of the two participants
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],

  // References to buyer and seller for easier queries
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // The product this chat is about (optional for general user-to-user chats)
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false,
  },
  // The history of messages in this conversation
  messages: [messageSchema],
}, { timestamps: true }); // timestamps adds createdAt and updatedAt

const Chat = mongoose.model('Chat', chatSchema);

export default Chat; // Use ES Module export

