import pool from "../db.js";

// Ensure social tables exist
export const ensureSocialTables = async () => {
  // notifications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id           SERIAL PRIMARY KEY,
      recipient_id INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      actor_id     INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      type         VARCHAR(50) NOT NULL,
      reference_id INTEGER,
      is_read      BOOLEAN NOT NULL DEFAULT false,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // conversations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id         SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // conversation_members table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id         INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, user_id)
    )
  `);

  // messages table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id              SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id       INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      message         TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_read         BOOLEAN NOT NULL DEFAULT false
    )
  `);

  // stories table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stories (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      media_url  TEXT NOT NULL,
      media_type VARCHAR(20) NOT NULL DEFAULT 'image',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // story_views table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS story_views (
      story_id  INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (story_id, user_id)
    )
  `);

  // collab_requests table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collab_requests (
      id          SERIAL PRIMARY KEY,
      sender_id   INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      beat_name   VARCHAR(255),
      message     TEXT,
      role        VARCHAR(50) NOT NULL,
      status      VARCHAR(20) NOT NULL DEFAULT 'Pending',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
    CREATE INDEX IF NOT EXISTS idx_collab_receiver ON collab_requests(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_collab_sender ON collab_requests(sender_id);
  `);
};

// GET /social/notifications?user_id=X
export const getNotifications = async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing user_id." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         n.id,
         n.recipient_id,
         n.actor_id,
         n.type,
         n.reference_id,
         n.is_read,
         n.created_at,
         u.username,
         u.display_name,
         CASE WHEN u.profile_complete = true THEN u.profile_picture ELSE u.avatar_url END AS avatar_url,
         u.is_founder
       FROM notifications n
       JOIN SyncLabUsers u ON u.id = n.actor_id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC`,
      [userId]
    );
    res.json({ success: true, notifications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
};

// PUT /social/notifications/read
// Body: { user_id, notification_id } (if notification_id is omitted, mark all as read)
export const markNotificationsRead = async (req, res) => {
  const userId = parseInt(req.body.user_id, 10);
  const notificationId = req.body.notification_id ? parseInt(req.body.notification_id, 10) : null;

  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing user_id." });
  }

  try {
    if (notificationId) {
      await pool.query(
        `UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2`,
        [notificationId, userId]
      );
    } else {
      await pool.query(
        `UPDATE notifications SET is_read = true WHERE recipient_id = $1`,
        [userId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to mark notifications as read." });
  }
};

// POST /social/conversations
// Body: { user_id, target_id }
export const getOrCreateConversation = async (req, res) => {
  const userId = parseInt(req.body.user_id, 10);
  const targetId = parseInt(req.body.target_id, 10);

  if (!userId || !targetId) {
    return res.status(400).json({ success: false, message: "Missing user IDs." });
  }
  if (userId === targetId) {
    return res.status(400).json({ success: false, message: "Cannot message yourself." });
  }

  try {
    // Check if conversation already exists between these two users
    const existing = await pool.query(
      `SELECT cm1.conversation_id
       FROM conversation_members cm1
       JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       WHERE cm1.user_id = $1 AND cm2.user_id = $2`,
      [userId, targetId]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, conversationId: existing.rows[0].conversation_id });
    }

    // Create new conversation
    const newConv = await pool.query(
      `INSERT INTO conversations DEFAULT VALUES RETURNING id`
    );
    const conversationId = newConv.rows[0].id;

    // Add members
    await pool.query(
      `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [conversationId, userId, targetId]
    );

    res.json({ success: true, conversationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create conversation." });
  }
};

// GET /social/conversations?user_id=X
export const getConversations = async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing user_id." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         c.id AS conversation_id,
         u.id AS user_id,
         u.username,
         u.display_name,
         CASE WHEN u.profile_complete = true THEN u.profile_picture ELSE u.avatar_url END AS avatar_url,
         u.is_founder,
         m.message AS last_message,
         m.created_at AS last_message_time,
         (
           SELECT COUNT(*)::int
           FROM messages
           WHERE conversation_id = c.id
             AND sender_id <> $1
             AND is_read = false
         ) AS unread_count
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id <> $1
       JOIN SyncLabUsers u ON u.id = cm.user_id
       LEFT JOIN LATERAL (
         SELECT message, created_at
         FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON true
       WHERE EXISTS (
         SELECT 1 FROM conversation_members WHERE conversation_id = c.id AND user_id = $1
       )
       ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
      [userId]
    );
    res.json({ success: true, conversations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch conversations." });
  }
};

// GET /social/conversations/:conversationId/messages?user_id=X
export const getMessages = async (req, res) => {
  const conversationId = parseInt(req.params.conversationId, 10);
  const userId = parseInt(req.query.user_id, 10);

  if (!conversationId || !userId) {
    return res.status(400).json({ success: false, message: "Missing parameters." });
  }

  try {
    // Mark messages from other user as read
    await pool.query(
      `UPDATE messages
       SET is_read = true
       WHERE conversation_id = $1 AND sender_id <> $2`,
      [conversationId, userId]
    );

    const { rows } = await pool.query(
      `SELECT id, conversation_id, sender_id, message, created_at, is_read
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json({ success: true, messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch messages." });
  }
};

// POST /social/conversations/:conversationId/messages
// Body: { sender_id, message }
export const sendMessage = async (req, res) => {
  const conversationId = parseInt(req.params.conversationId, 10);
  const senderId = parseInt(req.body.sender_id, 10);
  const { message } = req.body;

  if (!conversationId || !senderId || !message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Missing parameters." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, message, created_at, is_read`,
      [conversationId, senderId, message.trim()]
    );

    res.json({ success: true, message: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
};

// ==========================================
// STORIES API
// ==========================================

// GET /social/stories?user_id=X
export const getStories = async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing user_id." });
  }

  try {
    // Only return stories created in the last 24 hours
    const { rows } = await pool.query(
      `SELECT s.id, s.user_id, s.media_url, s.media_type, s.created_at,
              u.username, u.display_name, u.avatar_url, u.profile_picture, u.profile_complete, u.is_founder,
              EXISTS(SELECT 1 FROM story_views WHERE story_id = s.id AND user_id = $1) AS is_viewed
       FROM stories s
       JOIN SyncLabUsers u ON u.id = s.user_id
       WHERE s.created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY s.created_at ASC`,
      [userId]
    );

    // Group stories by user
    const userStoriesMap = {};
    rows.forEach(story => {
      if (!userStoriesMap[story.user_id]) {
        userStoriesMap[story.user_id] = {
          user_id: story.user_id,
          username: story.username,
          display_name: story.display_name,
          avatar_url: story.avatar_url,
          profile_picture: story.profile_picture,
          profile_complete: story.profile_complete,
          is_founder: story.is_founder,
          stories: [],
          all_viewed: true
        };
      }
      userStoriesMap[story.user_id].stories.push(story);
      if (!story.is_viewed) {
        userStoriesMap[story.user_id].all_viewed = false;
      }
    });

    res.json({ success: true, userStories: Object.values(userStoriesMap) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch stories." });
  }
};

// POST /social/stories
// Body: { user_id, media_url, media_type }
export const createStory = async (req, res) => {
  const { user_id, media_url, media_type } = req.body;
  const userId = parseInt(user_id, 10);

  if (!userId || !media_url) {
    return res.status(400).json({ success: false, message: "Missing parameters." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO stories (user_id, media_url, media_type)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, media_url, media_type, created_at`,
      [userId, media_url, media_type || 'image']
    );
    res.json({ success: true, story: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create story." });
  }
};

// POST /social/stories/:storyId/view
// Body: { user_id }
export const markStoryViewed = async (req, res) => {
  const storyId = parseInt(req.params.storyId, 10);
  const userId = parseInt(req.body.user_id, 10);

  if (!storyId || !userId) {
    return res.status(400).json({ success: false, message: "Missing parameters." });
  }

  try {
    await pool.query(
      `INSERT INTO story_views (story_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [storyId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to mark story as viewed." });
  }
};

// DELETE /social/stories/:storyId
// Body: { user_id }
export const deleteStory = async (req, res) => {
  const storyId = parseInt(req.params.storyId, 10);
  const userId = parseInt(req.body.user_id, 10);

  if (!storyId || !userId) {
    return res.status(400).json({ success: false, message: "Missing parameters." });
  }

  try {
    const check = await pool.query("SELECT user_id FROM stories WHERE id = $1", [storyId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Story not found." });
    }
    if (check.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    await pool.query("DELETE FROM stories WHERE id = $1", [storyId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete story." });
  }
};

// ==========================================
// COLLAB REQUESTS API
// ==========================================

// GET /social/collabs?user_id=X
export const getCollabRequests = async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing user_id." });
  }

  try {
    // Incoming requests
    const incomingRes = await pool.query(
      `SELECT c.id, c.sender_id, c.receiver_id, c.beat_name, c.message, c.role, c.status, c.created_at,
              u.username, u.display_name,
              CASE WHEN u.profile_complete = true THEN u.profile_picture ELSE u.avatar_url END AS avatar_url,
              u.is_founder
       FROM collab_requests c
       JOIN SyncLabUsers u ON u.id = c.sender_id
       WHERE c.receiver_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    // Outgoing requests
    const outgoingRes = await pool.query(
      `SELECT c.id, c.sender_id, c.receiver_id, c.beat_name, c.message, c.role, c.status, c.created_at,
              u.username, u.display_name,
              CASE WHEN u.profile_complete = true THEN u.profile_picture ELSE u.avatar_url END AS avatar_url,
              u.is_founder
       FROM collab_requests c
       JOIN SyncLabUsers u ON u.id = c.receiver_id
       WHERE c.sender_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      incoming: incomingRes.rows,
      outgoing: outgoingRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch collab requests." });
  }
};

// POST /social/collabs
// Body: { sender_id, receiver_id, beat_name, message, role }
export const sendCollabRequest = async (req, res) => {
  const { sender_id, receiver_id, beat_name, message, role } = req.body;
  const senderId = parseInt(sender_id, 10);
  const receiverId = parseInt(receiver_id, 10);

  if (!senderId || !receiverId || !role) {
    return res.status(400).json({ success: false, message: "Missing parameters." });
  }
  if (senderId === receiverId) {
    return res.status(400).json({ success: false, message: "Cannot send collab request to yourself." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO collab_requests (sender_id, receiver_id, beat_name, message, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [senderId, receiverId, beat_name || "", message || "", role]
    );

    const requestId = result.rows[0].id;

    // Send notification to receiver
    await pool.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, reference_id)
       VALUES ($1, $2, 'collab_request', $3)`,
      [receiverId, senderId, requestId]
    );

    res.json({ success: true, id: requestId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send collab request." });
  }
};

// PUT /social/collabs/:requestId/status
// Body: { user_id, status } ('Accepted' | 'Declined')
export const updateCollabStatus = async (req, res) => {
  const requestId = parseInt(req.params.requestId, 10);
  const userId = parseInt(req.body.user_id, 10);
  const { status } = req.body;

  if (!requestId || !userId || !['Accepted', 'Declined'].includes(status)) {
    return res.status(400).json({ success: false, message: "Missing or invalid parameters." });
  }

  try {
    const check = await pool.query("SELECT sender_id, receiver_id, status FROM collab_requests WHERE id = $1", [requestId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Collab request not found." });
    }

    const collab = check.rows[0];
    if (collab.receiver_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    await pool.query("UPDATE collab_requests SET status = $1 WHERE id = $2", [status, requestId]);

    // Send notification to sender
    const notifType = status === 'Accepted' ? 'collab_accepted' : 'collab_declined';
    await pool.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, reference_id)
       VALUES ($1, $2, $3, $4)`,
      [collab.sender_id, userId, notifType, requestId]
    );

    // If accepted, automatically create DM conversation if one does not exist
    if (status === 'Accepted') {
      const existingConv = await pool.query(
        `SELECT cm1.conversation_id
         FROM conversation_members cm1
         JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
         WHERE cm1.user_id = $1 AND cm2.user_id = $2`,
        [collab.sender_id, userId]
      );

      if (existingConv.rows.length === 0) {
        const newConv = await pool.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`);
        const conversationId = newConv.rows[0].id;
        await pool.query(
          `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
          [conversationId, collab.sender_id, userId]
        );
        await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, message)
           VALUES ($1, $2, $3)`,
          [conversationId, userId, "Hey! I accepted your collaboration request. Let's work!"]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update collab status." });
  }
};

// DELETE /social/collabs/:requestId
// Body: { user_id }
export const cancelCollabRequest = async (req, res) => {
  const requestId = parseInt(req.params.requestId, 10);
  const userId = parseInt(req.body.user_id, 10);

  if (!requestId || !userId) {
    return res.status(400).json({ success: false, message: "Missing parameters." });
  }

  try {
    const check = await pool.query("SELECT sender_id FROM collab_requests WHERE id = $1", [requestId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Collab request not found." });
    }
    if (check.rows[0].sender_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    await pool.query("DELETE FROM collab_requests WHERE id = $1", [requestId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to cancel collab request." });
  }
};

// POST /social/stories/:storyId/reply
// Body: { sender_id, message }
export const replyToStory = async (req, res) => {
  const storyId = parseInt(req.params.storyId, 10);
  const senderId = parseInt(req.body.sender_id, 10);
  const { message } = req.body;

  if (!storyId || !senderId || !message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Missing parameters." });
  }

  try {
    // 1. Find the story owner
    const storyRes = await pool.query("SELECT user_id FROM stories WHERE id = $1", [storyId]);
    if (storyRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Story not found." });
    }
    const targetId = storyRes.rows[0].user_id;

    if (senderId === targetId) {
      return res.status(400).json({ success: false, message: "Cannot reply to your own story." });
    }

    // 2. Get or create conversation
    let conversationId;
    const existing = await pool.query(
      `SELECT cm1.conversation_id
       FROM conversation_members cm1
       JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       WHERE cm1.user_id = $1 AND cm2.user_id = $2`,
      [senderId, targetId]
    );

    if (existing.rows.length > 0) {
      conversationId = existing.rows[0].conversation_id;
    } else {
      const newConv = await pool.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`);
      conversationId = newConv.rows[0].id;
      await pool.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [conversationId, senderId, targetId]
      );
    }

    // 3. Insert message
    const msgResult = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, message, created_at, is_read`,
      [conversationId, senderId, message.trim()]
    );

    // 4. Create notification for story owner
    await pool.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, reference_id)
       VALUES ($1, $2, 'story_reply', $3)`,
      [targetId, senderId, storyId]
    );

    res.json({ success: true, conversationId, message: msgResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to reply to story." });
  }
};
