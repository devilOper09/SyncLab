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
  replyToStory,
} from "../controllers/socialController.js";
import { arcjetMiddleware, moderateRateLimitRule } from "../utils/arcjet.js";

const router = express.Router();

// Notifications
router.get("/notifications", getNotifications);
router.put("/notifications/read", markNotificationsRead);

// Conversations
router.post("/conversations", getOrCreateConversation);
router.get("/conversations", getConversations);

// Messages
router.get("/conversations/:conversationId/messages", getMessages);
router.post("/conversations/:conversationId/messages", arcjetMiddleware([moderateRateLimitRule]), sendMessage);

// Stories
router.get("/stories", getStories);
router.post("/stories", arcjetMiddleware([moderateRateLimitRule]), createStory);
router.post("/stories/:storyId/view", markStoryViewed);
router.delete("/stories/:storyId", arcjetMiddleware([moderateRateLimitRule]), deleteStory);
router.post("/stories/:storyId/reply", arcjetMiddleware([moderateRateLimitRule]), replyToStory);

// Collab Requests
router.get("/collabs", getCollabRequests);
router.post("/collabs", arcjetMiddleware([moderateRateLimitRule]), sendCollabRequest);
router.put("/collabs/:requestId/status", arcjetMiddleware([moderateRateLimitRule]), updateCollabStatus);
router.delete("/collabs/:requestId", arcjetMiddleware([moderateRateLimitRule]), cancelCollabRequest);

export default router;
