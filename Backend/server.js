import dotenv from "dotenv"
import { fileURLToPath } from "url"
import path from "path"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, ".env") })

import express from "express"
import cors from "cors"
import passport from "passport"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import googleAuth from "./routes/googleAuth.js"
import authRoutes from "./routes/authRoutes.js"
import profileRoutes from "./routes/profileRoutes.js"
import followRoutes from "./routes/followRoutes.js"
import socialRoutes from "./routes/socialRoutes.js"
import { ensureFollowsTable } from "./controllers/followController.js"
import { ensureSocialTables } from "./controllers/socialController.js"
import session from "express-session"
import pool from "./db.js"
import multer from "multer"
import { FOUNDER_EMAIL } from "./utils/founder.js"
import { validateId, validateString, validateUsername } from "./utils/validation.js"
import { arcjetMiddleware, generalRateLimitRule } from "./utils/arcjet.js"

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const app = express()
const PORT = process.env.PORT || 3000

// Express Hardening: Disable X-Powered-By
app.disable("x-powered-by");

// Helmet configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "http://localhost:5173",
          "http://localhost:5174",
          "https://synclab-xq0u.onrender.com",
          "https://*.vercel.app",
          "https://accounts.google.com",
        ],
        frameSrc: ["'self'", "https://accounts.google.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        mediaSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Session Security
const sessionSecret = process.env.SESSION_SECRET || "synclab-secret-fallback-key-321";
app.use(
  session({
    name: "synclab.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Multer File Upload Security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/x-m4a",
      "audio/m4a",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    const allowedExtensions = [
      ".mp3",
      ".mpeg",
      ".wav",
      ".ogg",
      ".m4a",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (allowedMimeTypes.includes(mime) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only audio and images are allowed."));
    }
  },
});

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
    CREATE TABLE IF NOT EXISTS post_likes (\
      id SERIAL PRIMARY KEY,\
      post_id INTEGER REFERENCES MusicPosts(id) ON DELETE CASCADE,\
      user_id INTEGER REFERENCES SyncLabUsers(id) ON DELETE CASCADE,\
      created_at TIMESTAMP DEFAULT NOW(),\
      UNIQUE(post_id, user_id)\
    )\
  `);
};

// General rate limiter for normal API requests
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests from this IP, please try again later." },
});
app.use("/api/", generalLimiter);

app.post("/api/upload", arcjetMiddleware([generalRateLimitRule]), upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded." })
  }
  res.json({ success: true, url: req.file.path })
})

app.use("/auth", googleAuth);
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/follow", followRoutes);
app.use("/social", socialRoutes);

app.get("/api/posts", async (req, res) => {
  try {
    const viewerId = req.query.user_id ? validateId(req.query.user_id, "User ID") : null;
    let queryText;
    let queryParams;

    if (viewerId) {
      queryText = `
        SELECT p.id AS "_id", p.user_id, p.caption, p.genre, p.post_type, p.audio_url, p.cover_url, p.created_at, p.visibility,
               p.likes_count, p.views_count,
               u.username AS "userName", u.display_name,
               COALESCE(u.profile_picture, u.avatar_url) AS avatar_url,
               u.is_founder,
               EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS liked_by_me
        FROM MusicPosts p
        JOIN SyncLabUsers u ON p.user_id = u.id
        WHERE p.visibility IS NULL OR p.visibility != 'private' OR p.user_id = $1
        ORDER BY p.created_at DESC
      `;
      queryParams = [viewerId];
    } else {
      queryText = `
        SELECT p.id AS "_id", p.user_id, p.caption, p.genre, p.post_type, p.audio_url, p.cover_url, p.created_at, p.visibility,
               p.likes_count, p.views_count,
               u.username AS "userName", u.display_name,
               COALESCE(u.profile_picture, u.avatar_url) AS avatar_url,
               u.is_founder
        FROM MusicPosts p
        JOIN SyncLabUsers u ON p.user_id = u.id
        WHERE p.visibility IS NULL OR p.visibility != 'private'
        ORDER BY p.created_at DESC
      `;
      queryParams = [];
    }

    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Failed to fetch posts" });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const caption = validateString(req.body.caption, "Caption", { maxLength: 1000 });

    let userId;
    if (req.body.user_id) {
      userId = validateId(req.body.user_id, "User ID");
      const check = await pool.query("SELECT id FROM SyncLabUsers WHERE id = $1", [userId]);
      if (check.rows.length === 0) {
        return res.status(400).json({ error: "User not found." });
      }
    } else if (req.body.userName) {
      const userName = validateUsername(req.body.userName);
      const userRes = await pool.query("SELECT id FROM SyncLabUsers WHERE username = $1", [userName]);
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
      } else {
        return res.status(400).json({ error: "User not found." });
      }
    } else {
      return res.status(400).json({ error: "user_id is required." });
    }

    const result = await pool.query(
      `INSERT INTO MusicPosts (user_id, caption, post_type)
       VALUES ($1, $2, 'thread')
       RETURNING id`,
      [userId, caption]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("POST /api/posts error:", err);
    res.status(400).json({ error: err.message || "Failed to create post" });
  }
});

// Like toggle endpoint
app.post("/api/posts/:id/like", async (req, res) => {
  try {
    const postId = validateId(req.params.id, "Post ID");
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    const userId = validateId(user_id, "User ID");

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
    res.status(400).json({ error: err.message || "Failed to toggle like" });
  }
});

// View tracking endpoint
app.post("/api/posts/:id/view", async (req, res) => {
  try {
    const postId = validateId(req.params.id, "Post ID");
    await pool.query("UPDATE MusicPosts SET views_count = views_count + 1 WHERE id = $1", [postId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Failed to track view" });
  }
});

// Trending posts endpoint
app.get("/api/posts/trending", async (req, res) => {
  try {
    const viewerId = req.query.user_id ? validateId(req.query.user_id, "User ID") : null;
    let queryText;
    let queryParams;

    if (viewerId) {
      queryText = `
        SELECT p.id AS "_id", p.user_id, p.caption, p.genre, p.post_type, p.audio_url, p.cover_url, p.created_at, p.visibility,
               p.likes_count, p.views_count,
               u.username AS "userName", u.display_name,
               COALESCE(u.profile_picture, u.avatar_url) AS avatar_url,
               u.is_founder,
               EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS liked_by_me
        FROM MusicPosts p
        JOIN SyncLabUsers u ON p.user_id = u.id
        WHERE (p.visibility IS NULL OR p.visibility != 'private' OR p.user_id = $1)
          AND p.audio_url IS NOT NULL
        ORDER BY (p.likes_count * 2 + p.views_count) DESC, p.created_at DESC
        LIMIT 20
      `;
      queryParams = [viewerId];
    } else {
      queryText = `
        SELECT p.id AS "_id", p.user_id, p.caption, p.genre, p.post_type, p.audio_url, p.cover_url, p.created_at, p.visibility,
               p.likes_count, p.views_count,
               u.username AS "userName", u.display_name,
               COALESCE(u.profile_picture, u.avatar_url) AS avatar_url,
               u.is_founder
        FROM MusicPosts p
        JOIN SyncLabUsers u ON p.user_id = u.id
        WHERE (p.visibility IS NULL OR p.visibility != 'private')
          AND p.audio_url IS NOT NULL
        ORDER BY (p.likes_count * 2 + p.views_count) DESC, p.created_at DESC
        LIMIT 20
      `;
      queryParams = [];
    }

    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Failed to fetch trending posts" });
  }
});

app.set("trust proxy", 1); 

app.get("/", (req, res)=>{
 res.send("Server is running")
})

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === "production" 
    ? "An unexpected error occurred. Please try again later." 
    : err.message || "Internal Server Error";
  res.status(status).json({ success: false, message });
});

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