import express from "express";
import {
  getNotifications,
  markNotificationsRead,
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  getStories,
  createStory,
  markStoryViewed,
  deleteStory,
  getCollabRequests,
  sendCollabRequest,
  updateCollabStatus,
  cancelCollabRequest,
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

// Stories
router.get("/stories", getStories);
router.post("/stories", createStory);
router.post("/stories/:storyId/view", markStoryViewed);
router.delete("/stories/:storyId", deleteStory);

// Collab Requests
router.get("/collabs", getCollabRequests);
router.post("/collabs", sendCollabRequest);
router.put("/collabs/:requestId/status", updateCollabStatus);
router.delete("/collabs/:requestId", cancelCollabRequest);

export default router;
