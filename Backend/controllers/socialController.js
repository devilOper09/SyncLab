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

  // Indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
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
         u.avatar_url,
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
         u.avatar_url,
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
