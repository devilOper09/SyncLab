import express from "express";
import {
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowCounts,
  getFollowers,
  getFollowing,
  searchUsers,
} from "../controllers/followController.js";
import { arcjetMiddleware, moderateRateLimitRule } from "../utils/arcjet.js";

const router = express.Router();

// Search users
router.get("/search", arcjetMiddleware([moderateRateLimitRule]), searchUsers);

// Follow / unfollow
router.post("/:targetId", arcjetMiddleware([moderateRateLimitRule]), followUser);
router.delete("/:targetId", arcjetMiddleware([moderateRateLimitRule]), unfollowUser);

// Status & counts
router.get("/status/:targetId", getFollowStatus);
router.get("/counts/:userId",   getFollowCounts);

// Lists
router.get("/followers/:userId", getFollowers);
router.get("/following/:userId", getFollowing);

export default router;
