import express from "express";
import {
  setupProfile,
  updateProfile,
  getProfile,
  getPostsByUser,
  createPost,
  deletePost,
} from "../controllers/profileController.js";

const router = express.Router();

router.post("/setup", setupProfile);
router.put("/update", updateProfile);
router.get("/:userId", getProfile);
router.get("/:userId/posts", getPostsByUser);
router.post("/post", createPost);
router.delete("/post/:postId", deletePost);

export default router;
