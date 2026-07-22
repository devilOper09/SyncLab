import express from "express";
import {
  getNotifications,
  markNotificationsRead,
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
} from "../controllers/socialController.js";

const router = express.Router();

// Notifications
router.get("/notifications", getNotifications);
router.put("/notifications/read", markNotificationsRead);

// Conversations
router.post("/conversations", getOrCreateConversation);
router.get("/conversations", getConversations);

// Messages
router.get("/conversations/:conversationId/messages", getMessages);
router.post("/conversations/:conversationId/messages", sendMessage);

export default router;
