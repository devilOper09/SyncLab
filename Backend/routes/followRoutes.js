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

const router = express.Router();

// Search users
router.get("/search", searchUsers);

// Follow / unfollow
router.post("/:targetId",   followUser);
router.delete("/:targetId", unfollowUser);

// Status & counts
router.get("/status/:targetId", getFollowStatus);
router.get("/counts/:userId",   getFollowCounts);

// Lists
router.get("/followers/:userId", getFollowers);
router.get("/following/:userId", getFollowing);

export default router;
