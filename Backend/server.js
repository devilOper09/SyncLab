import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import passport from "passport"
import googleAuth from "./routes/googleAuth.js"
import authRoutes from "./routes/authRoutes.js"
import profileRoutes from "./routes/profileRoutes.js"
import followRoutes from "./routes/followRoutes.js"
import socialRoutes from "./routes/socialRoutes.js"
import { ensureFollowsTable } from "./controllers/followController.js"
import { ensureSocialTables } from "./controllers/socialController.js"
import session from "express-session"
import pool from "./db.js"
import path from "path"
import { fileURLToPath } from "url"
import multer from "multer"
import { FOUNDER_EMAIL } from "./utils/founder.js"

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
const app = express()
const PORT = process.env.PORT || 3000

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true
}))
app.use(express.json())



app.use(session({
 secret: "synclab-secret",
 resave: false,
 saveUninitialized: true
}))

app.use(passport.initialize());
app.use(passport.session());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ storage })

const ensureFounderFlag = async () => {
  await pool.query(`
    ALTER TABLE IF EXISTS SyncLabUsers
    ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT false
  `)

  await pool.query(
    "UPDATE SyncLabUsers SET is_founder = (LOWER(email) = $1)",
    [FOUNDER_EMAIL]
  )

  await pool.query(`
    ALTER TABLE IF EXISTS SyncLabUsers
    ADD COLUMN IF NOT EXISTS profile_picture TEXT
  `)

  await pool.query(`
    ALTER TABLE IF EXISTS MusicPosts
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public'
  `)
}

const ensureEngagementTables = async () => {
  await pool.query(`
    ALTER TABLE IF EXISTS MusicPosts
    ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0
  `);
  await pool.query(`
    ALTER TABLE IF EXISTS MusicPosts
    ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES MusicPosts(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES SyncLabUsers(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(post_id, user_id)
    )
  `);
};

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded." })
  }
  const fileUrl = `http://localhost:3000/uploads/${req.file.filename}`
  res.json({ success: true, url: fileUrl })
})

app.use("/auth", googleAuth);
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/follow", followRoutes);
app.use("/social", socialRoutes);

app.get("/api/posts", async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query(`
      SELECT p.id AS "_id", p.user_id, p.caption, p.genre, p.post_type, p.audio_url, p.cover_url, p.created_at, p.visibility,
             p.likes_count, p.views_count,
             u.username AS "userName", u.display_name,
             COALESCE(u.profile_picture, u.avatar_url) AS avatar_url,
             u.is_founder
             ${user_id ? `, EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ${parseInt(user_id)}) AS liked_by_me` : ''}
      FROM MusicPosts p
      JOIN SyncLabUsers u ON p.user_id = u.id
      WHERE p.visibility IS NULL OR p.visibility != 'private'
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const { userName, caption } = req.body;
    const userRes = await pool.query("SELECT id FROM SyncLabUsers WHERE username = $1", [userName.toLowerCase().trim()]);
    let userId;
    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
    } else {
      const firstUser = await pool.query("SELECT id FROM SyncLabUsers LIMIT 1");
      if (firstUser.rows.length > 0) {
        userId = firstUser.rows[0].id;
      } else {
        return res.status(400).json({ error: "No users exist to associate with this post" });
      }
    }
    const result = await pool.query(
      `INSERT INTO MusicPosts (user_id, caption, post_type)
       VALUES ($1, $2, 'beat')
       RETURNING id`,
      [userId, caption]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Like toggle endpoint
app.post("/api/posts/:id/like", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    const userId = parseInt(user_id);

    const existing = await pool.query(
      "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
      [postId, userId]
    );

    if (existing.rows.length > 0) {
      await pool.query("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", [postId, userId]);
    } else {
      await pool.query("INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)", [postId, userId]);
    }

    await pool.query(
      "UPDATE MusicPosts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1",
      [postId]
    );

    const updated = await pool.query("SELECT likes_count FROM MusicPosts WHERE id = $1", [postId]);
    res.json({
      liked: existing.rows.length === 0,
      likes_count: updated.rows[0]?.likes_count || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// View tracking endpoint
app.post("/api/posts/:id/view", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await pool.query("UPDATE MusicPosts SET views_count = views_count + 1 WHERE id = $1", [postId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to track view" });
  }
});

// Trending posts endpoint
app.get("/api/posts/trending", async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query(`
      SELECT p.id AS "_id", p.user_id, p.caption, p.genre, p.post_type, p.audio_url, p.cover_url, p.created_at, p.visibility,
             p.likes_count, p.views_count,
             u.username AS "userName", u.display_name,
             COALESCE(u.profile_picture, u.avatar_url) AS avatar_url,
             u.is_founder
             ${user_id ? `, EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ${parseInt(user_id)}) AS liked_by_me` : ''}
      FROM MusicPosts p
      JOIN SyncLabUsers u ON p.user_id = u.id
      WHERE (p.visibility IS NULL OR p.visibility != 'private')
        AND p.audio_url IS NOT NULL
      ORDER BY (p.likes_count * 2 + p.views_count) DESC, p.created_at DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch trending posts" });
  }
});

app.set("trust proxy", 1); 

app.get("/", (req, res)=>{
 res.send("Server is running")
})



const startServer = async () => {
  try {
    await ensureFounderFlag()
    await ensureEngagementTables()
    await ensureFollowsTable()
    await ensureSocialTables()
    app.listen(PORT, ()=>{
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error("Failed to initialize server:", error)
    process.exit(1)
  }
}

startServer()