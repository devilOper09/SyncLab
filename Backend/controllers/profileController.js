import pool from "../db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// PUT /profile/update
export const updateProfile = async (req, res) => {
  try {
    const { user_id, display_name, username, role, bio, genres, avatar_url, cover_url } = req.body;

    if (!user_id || !username || !role) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    // Check username uniqueness
    const taken = await pool.query(
      "SELECT 1 FROM SyncLabUsers WHERE username = $1 AND id != $2",
      [username.toLowerCase().trim(), user_id]
    );
    if (taken.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Username is already taken." });
    }

    const isUploaded = avatar_url && avatar_url.includes('/uploads/');
    const profile_picture = isUploaded ? avatar_url : null;

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
           cover_url    = $8
       WHERE id = $9`,
      [
        display_name.trim() || username,
        username.toLowerCase().trim(),
        role,
        bio || "",
        genres || [],
        avatar_url || null,
        profile_picture,
        cover_url || null,
        user_id,
      ]
    );

    res.json({ success: true, message: "Profile updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
};

// POST /profile/setup
export const setupProfile = async (req, res) => {
  try {
    const { user_id, display_name, username, role, bio, genres, avatar_url } = req.body;

    if (!user_id || !display_name || !username || !role) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    // Check username uniqueness
    const taken = await pool.query(
      "SELECT 1 FROM SyncLabUsers WHERE username = $1 AND id != $2",
      [username.toLowerCase().trim(), user_id]
    );
    if (taken.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Username is already taken." });
    }

    const isUploaded = avatar_url && avatar_url.includes('/uploads/');
    const profile_picture = isUploaded ? avatar_url : null;

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
        display_name.trim(),
        username.toLowerCase().trim(),
        role,
        bio || "",
        genres || [],
        avatar_url || null,
        profile_picture,
        user_id,
      ]
    );

    res.json({ success: true, message: "Profile saved." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to save profile." });
  }
};

// GET /profile/:userId
export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT id, email, display_name, username, role, bio, genres,
              CASE WHEN profile_complete = true THEN profile_picture ELSE avatar_url END AS avatar_url,
              avatar, cover_url, profile_complete, is_founder,
              followers_count, following_count, profile_picture
       FROM SyncLabUsers WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, profile: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
};

// GET /profile/:userId/posts
export const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.query.viewer_id ? parseInt(req.query.viewer_id, 10) : null;

    const result = await pool.query(
      `SELECT id, user_id, caption, genre, post_type, audio_url, cover_url, created_at, visibility
       FROM MusicPosts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Filter posts: if visibility is 'private', only show if viewerId === userId
    const filteredPosts = result.rows.filter(post => {
      if (post.visibility === 'private') {
        return viewerId === parseInt(userId, 10);
      }
      return true;
    });

    res.json({ success: true, posts: filteredPosts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch posts." });
  }
};

// POST /profile/post
export const createPost = async (req, res) => {
  try {
    const { user_id, caption, genre, post_type, audio_url, cover_url, visibility } = req.body;

    if (!user_id || !post_type) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const result = await pool.query(
      `INSERT INTO MusicPosts (user_id, caption, genre, post_type, audio_url, cover_url, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [user_id, caption || "", genre || "", post_type, audio_url || null, cover_url || null, visibility || 'public']
    );

    res.json({ success: true, post: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create post." });
  }
};

// DELETE /profile/post/:postId
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { user_id } = req.body;

    const postRes = await pool.query(
      "SELECT user_id, audio_url, cover_url FROM MusicPosts WHERE id = $1",
      [postId]
    );

    if (postRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    const post = postRes.rows[0];

    if (post.user_id !== parseInt(user_id)) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this post." });
    }

    const deleteLocalFile = (fileUrl) => {
      if (!fileUrl) return;
      try {
        const filename = fileUrl.split("/uploads/")[1];
        if (filename) {
          const filePath = path.join(__dirname, "..", "uploads", filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (err) {
        console.error("Failed to delete local file:", err);
      }
    };

    deleteLocalFile(post.audio_url);
    deleteLocalFile(post.cover_url);

    await pool.query("DELETE FROM MusicPosts WHERE id = $1", [postId]);

    res.json({ success: true, message: "Post deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete post." });
  }
};
