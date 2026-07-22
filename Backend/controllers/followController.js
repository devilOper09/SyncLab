import pool from "../db.js";

// Ensure follows table exists
export const ensureFollowsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS follows (
      id           SERIAL PRIMARY KEY,
      follower_id  INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (follower_id, following_id),
      CHECK (follower_id <> following_id)
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_follows_follower   ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following  ON follows(following_id);
  `);
};

// POST /follow/:targetId  { user_id }
export const followUser = async (req, res) => {
  const followerId  = parseInt(req.body.user_id, 10);
  const followingId = parseInt(req.params.targetId, 10);

  if (!followerId || !followingId) {
    return res.status(400).json({ success: false, message: "Missing user IDs." });
  }
  if (followerId === followingId) {
    return res.status(400).json({ success: false, message: "Cannot follow yourself." });
  }

  try {
    // Insert follow relationship
    const insertRes = await pool.query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id`,
      [followerId, followingId]
    );

    // Only update counts if a new row was actually inserted
    if (insertRes.rows.length > 0) {
      const followId = insertRes.rows[0].id;
      await pool.query(
        `UPDATE SyncLabUsers SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = $1) WHERE id = $1`,
        [followingId]
      );
      await pool.query(
        `UPDATE SyncLabUsers SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = $1) WHERE id = $1`,
        [followerId]
      );
      // Create follow notification
      await pool.query(
        `INSERT INTO notifications (recipient_id, actor_id, type, reference_id)
         VALUES ($1, $2, 'follow', $3)`,
        [followingId, followerId, followId]
      );
    }

    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM follows WHERE following_id = $1`,
      [followingId]
    );
    res.json({ success: true, followers: parseInt(rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to follow user." });
  }
};

// DELETE /follow/:targetId  { user_id }
export const unfollowUser = async (req, res) => {
  const followerId  = parseInt(req.body.user_id, 10);
  const followingId = parseInt(req.params.targetId, 10);

  if (!followerId || !followingId) {
    return res.status(400).json({ success: false, message: "Missing user IDs." });
  }

  try {
    // Delete follow relationship
    const deleteRes = await pool.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING id`,
      [followerId, followingId]
    );

    // Only update counts if a row was actually deleted
    if (deleteRes.rows.length > 0) {
      await pool.query(
        `UPDATE SyncLabUsers SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = $1) WHERE id = $1`,
        [followingId]
      );
      await pool.query(
        `UPDATE SyncLabUsers SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = $1) WHERE id = $1`,
        [followerId]
      );
    }

    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM follows WHERE following_id = $1`,
      [followingId]
    );
    res.json({ success: true, followers: parseInt(rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to unfollow user." });
  }
};

// GET /follow/status/:targetId?user_id=X
export const getFollowStatus = async (req, res) => {
  const followerId  = parseInt(req.query.user_id, 10);
  const followingId = parseInt(req.params.targetId, 10);

  if (!followerId || !followingId) {
    return res.json({ isFollowing: false });
  }

  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    res.json({ isFollowing: rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ isFollowing: false });
  }
};

// GET /follow/counts/:userId
export const getFollowCounts = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  try {
    const [followers, following] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS count FROM follows WHERE following_id = $1`, [userId]),
      pool.query(`SELECT COUNT(*) AS count FROM follows WHERE follower_id  = $1`, [userId]),
    ]);
    res.json({
      followers: parseInt(followers.rows[0].count, 10),
      following: parseInt(following.rows[0].count, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ followers: 0, following: 0 });
  }
};

// GET /follow/followers/:userId  — list of users who follow userId
export const getFollowers = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const currentUserId = parseInt(req.query.user_id, 10) || null;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.role, u.is_founder,
              CASE WHEN $2::int IS NOT NULL THEN
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id)
              ELSE false END AS is_following
       FROM follows f
       JOIN SyncLabUsers u ON u.id = f.follower_id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC`,
      [userId, currentUserId]
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, users: [] });
  }
};

// GET /follow/following/:userId  — list of users that userId follows
export const getFollowing = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const currentUserId = parseInt(req.query.user_id, 10) || null;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.role, u.is_founder,
              CASE WHEN $2::int IS NOT NULL THEN
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id)
              ELSE false END AS is_following
       FROM follows f
       JOIN SyncLabUsers u ON u.id = f.following_id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [userId, currentUserId]
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, users: [] });
  }
};

// GET /follow/search?q=&role=&user_id=
export const searchUsers = async (req, res) => {
  const { q = "", role = "", user_id } = req.query;
  const currentUserId = parseInt(user_id, 10) || null;
  const term = q.trim();

  try {
    const { rows } = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.display_name,
         u.avatar_url,
         u.role,
         u.bio,
         u.is_founder,
         (SELECT COUNT(*) FROM follows WHERE following_id = u.id)::int AS followers_count,
         CASE WHEN $3::int IS NOT NULL THEN
           EXISTS(SELECT 1 FROM follows WHERE follower_id = $3 AND following_id = u.id)
         ELSE false END AS is_following
       FROM SyncLabUsers u
       WHERE
         ($1 = '' OR (
           u.username     ILIKE '%' || $1 || '%' OR
           u.display_name ILIKE '%' || $1 || '%' OR
           u.role         ILIKE '%' || $1 || '%'
         ))
         AND ($2 = '' OR u.role ILIKE $2)
         AND ($3::int IS NULL OR u.id <> $3)
       ORDER BY followers_count DESC, u.display_name ASC
       LIMIT 50`,
      [term, role, currentUserId]
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, users: [] });
  }
};
