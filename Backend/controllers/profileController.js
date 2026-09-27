import pool from "../db.js";
import { v2 as cloudinary } from "cloudinary";
import { validateId, validateUsername, validateString, validateGenres, validatePostType, validateVisibility } from "../utils/validation.js";

// PUT /profile/update
export const updateProfile = async (req, res) => {
  try {
    const { user_id, display_name, username, role, bio, genres, avatar_url, cover_url } = req.body;

    if (!user_id || !username || !role) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const cleanUserId = validateId(user_id, "User ID");
    const cleanUsername = validateUsername(username);
    const cleanRole = validateString(role, "Role", { required: true, maxLength: 50 });
    const cleanDisplayName = validateString(display_name, "Display Name", { maxLength: 100 }) || cleanUsername;
    const cleanBio = validateString(bio, "Bio", { maxLength: 500 });
    const parsedGenres = typeof genres === "string" ? JSON.parse(genres) : genres;
    const cleanGenres = validateGenres(parsedGenres);
    const rawAvatarUrl = validateString(avatar_url, "Avatar URL", { maxLength: 2048, escape: false });
    // Reject blob: URLs — they are temporary browser-local object URLs, never valid for storage
    const cleanAvatarUrl = rawAvatarUrl && !rawAvatarUrl.startsWith("blob:") ? rawAvatarUrl : null;
    const rawCoverUrl = validateString(cover_url, "Cover URL", { maxLength: 2048, escape: false });
    const cleanCoverUrl = rawCoverUrl && !rawCoverUrl.startsWith("blob:") ? rawCoverUrl : null;

    // Check username uniqueness
    const taken = await pool.query(
      "SELECT 1 FROM SyncLabUsers WHERE username = $1 AND id != $2",
      [cleanUsername, cleanUserId]
    );
    if (taken.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Username is already taken." });
    }

    const profile_picture = req.files?.profilePicture?.[0]?.path || req.file?.path || null;
    const cover_picture = req.files?.coverPicture?.[0]?.path || null;

    // Only update avatar columns if a new file or valid URL was provided
    const avatarValue = profile_picture || cleanAvatarUrl;
    const coverValue = cover_picture || cleanCoverUrl;

    const setClauses = [
      "display_name = $1",
      "username     = $2",
      "role         = $3",
      "bio          = $4",
      "genres       = $5",
    ];
    const params = [cleanDisplayName, cleanUsername, cleanRole, cleanBio, cleanGenres];

    if (avatarValue !== null) {
      const idx = params.length + 1;
      setClauses.push(`avatar_url = $${idx}`, `avatar = $${idx}`);
      params.push(avatarValue);
      const pidx = params.length + 1;
      setClauses.push(`profile_picture = $${pidx}`);
      params.push(profile_picture);
    }
    if (coverValue !== null) {
      const cidx = params.length + 1;
      setClauses.push(`cover_url = $${cidx}`);
      params.push(coverValue);
    }

    const widx = params.length + 1;
    params.push(cleanUserId);

    await pool.query(
      `UPDATE SyncLabUsers SET ${setClauses.join(", ")} WHERE id = $${widx}`,
      params
    );

    res.json({ success: true, message: "Profile updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || "Failed to update profile." });
  }
};

// POST /profile/setup
export const setupProfile = async (req, res) => {
  try {
    const { user_id, display_name, username, role, bio, genres, avatar_url } = req.body;

    if (!user_id || !display_name || !username || !role) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const cleanUserId = validateId(user_id, "User ID");
    const cleanUsername = validateUsername(username);
    const cleanRole = validateString(role, "Role", { required: true, maxLength: 50 });
    const cleanDisplayName = validateString(display_name, "Display Name", { required: true, maxLength: 100 });
    const cleanBio = validateString(bio, "Bio", { maxLength: 500 });
    const parsedGenres = typeof genres === "string" ? JSON.parse(genres) : genres;
    const cleanGenres = validateGenres(parsedGenres);
    const rawAvatarUrl = validateString(avatar_url, "Avatar URL", { maxLength: 2048, escape: false });
    const cleanAvatarUrl = rawAvatarUrl && !rawAvatarUrl.startsWith("blob:") ? rawAvatarUrl : null;

    // Check username uniqueness
    const taken = await pool.query(
      "SELECT 1 FROM SyncLabUsers WHERE username = $1 AND id != $2",
      [cleanUsername, cleanUserId]
    );
    if (taken.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Username is already taken." });
    }

    const profile_picture = req.file?.path || null;

    await pool.query(
      `UPDATE SyncLabUsers
       SET display_name = $1,
           username     = $2,
           role         = $3,
           bio          = $4,
           genres       = $5,
           avatar_url   = $6,
           avatar       = $6,
           profile_picture = $7,
           profile_complete = true
       WHERE id = $8`,
      [
        cleanDisplayName,
        cleanUsername,
        cleanRole,
        cleanBio,
        cleanGenres,
        profile_picture || cleanAvatarUrl || null,
        profile_picture,
        cleanUserId,
      ]
    );

    res.json({ success: true, message: "Profile saved." });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || "Failed to save profile." });
  }
};

// GET /profile/:userId
export const getProfile = async (req, res) => {
  try {
    const cleanUserId = validateId(req.params.userId, "User ID");

    const result = await pool.query(
      `SELECT id, email, display_name, username, role, bio, genres,
              COALESCE(profile_picture, avatar_url) AS avatar_url,
              avatar, cover_url, profile_complete, is_founder,
              followers_count, following_count, profile_picture
       FROM SyncLabUsers WHERE id = $1`,
      [cleanUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, profile: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || "Failed to fetch profile." });
  }
};

// GET /profile/:userId/posts
export const getPostsByUser = async (req, res) => {
  try {
    const cleanUserId = validateId(req.params.userId, "User ID");
    const viewerId = req.query.viewer_id ? validateId(req.query.viewer_id, "Viewer ID") : null;

    const result = await pool.query(
      `SELECT id, user_id, caption, genre, post_type, audio_url, cover_url, created_at, visibility
       FROM MusicPosts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [cleanUserId]
    );

    // Filter posts: if visibility is 'private', only show if viewerId === userId
    const filteredPosts = result.rows.filter(post => {
      if (post.visibility === 'private') {
        return viewerId === cleanUserId;
      }
      return true;
    });

    res.json({ success: true, posts: filteredPosts });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || "Failed to fetch posts." });
  }
};

// POST /profile/post
export const createPost = async (req, res) => {
  try {
    const { user_id, caption, genre, post_type, cover_url, visibility } = req.body;

    if (!user_id || !post_type) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const cleanUserId = validateId(user_id, "User ID");
    const cleanCaption = validateString(caption, "Caption", { maxLength: 1000 });
    const cleanGenre = validateString(genre, "Genre", { maxLength: 100 });
    const cleanPostType = validatePostType(post_type);
    const audioUrl = req.files?.["audio"]?.[0]?.path || null;
    const coverUrl = req.files?.["cover"]?.[0]?.path || null;
    const cleanCoverUrl = coverUrl || validateString(cover_url, "Cover URL", { maxLength: 2048, escape: false }) || null;
    const cleanVisibility = validateVisibility(visibility);

    const result = await pool.query(
      `INSERT INTO MusicPosts (user_id, caption, genre, post_type, audio_url, cover_url, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [cleanUserId, cleanCaption, cleanGenre, cleanPostType, audioUrl, cleanCoverUrl || null, cleanVisibility]
    );

    res.json({ success: true, post: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || "Failed to create post." });
  }
};

// DELETE /profile/post/:postId
export const deletePost = async (req, res) => {
  try {
    const cleanPostId = validateId(req.params.postId, "Post ID");
    const { user_id } = req.body;
    const cleanUserId = validateId(user_id, "User ID");

    const postRes = await pool.query(
      "SELECT user_id, audio_url, cover_url FROM MusicPosts WHERE id = $1",
      [cleanPostId]
    );

    if (postRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    const post = postRes.rows[0];

    if (post.user_id !== cleanUserId) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this post." });
    }

    const deleteCloudinaryFile = async (fileUrl, resourceType = "image") => {
      if (!fileUrl || !fileUrl.includes("cloudinary")) return;
      try {
        const parts = fileUrl.split("/upload/");
        if (parts[1]) {
          const publicId = parts[1].split("/").slice(1).join("/").replace(/\.[^/.]+$/, "");
          await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        }
      } catch (err) {
        console.error("Failed to delete Cloudinary file:", err);
      }
    };

    await deleteCloudinaryFile(post.audio_url, "video");
    await deleteCloudinaryFile(post.cover_url, "image");

    await pool.query("DELETE FROM MusicPosts WHERE id = $1", [cleanPostId]);

    res.json({ success: true, message: "Post deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || "Failed to delete post." });
  }
};
