import express from "express";
import {
  setupProfile,
  updateProfile,
  getProfile,
  getPostsByUser,
  createPost,
  deletePost,
} from "../controllers/profileController.js";
import { arcjetMiddleware, moderateRateLimitRule } from "../utils/arcjet.js";
import upload from "../utils/upload.js";
import audioUpload from "../utils/audioUplaod.js";

const router = express.Router();

router.post("/setup", arcjetMiddleware([moderateRateLimitRule]), upload.single("profilePicture"), setupProfile);
router.put("/update", arcjetMiddleware([moderateRateLimitRule]), upload.fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "coverPicture", maxCount: 1 },
]), updateProfile);
router.get("/:userId", getProfile);
router.get("/:userId/posts", getPostsByUser);
router.post(
  "/post",
  arcjetMiddleware([moderateRateLimitRule]),
  audioUpload.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  createPost
);
router.delete(
  "/post/:postId",
  arcjetMiddleware([moderateRateLimitRule]),
  deletePost
);

export default router;
