import dotenv from "dotenv"
import express from "express"
import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import pool from "../db.js"
import { isFounderEmail } from "../utils/founder.js"

dotenv.config()
const router = express.Router();

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback"
},
async (accessToken, refreshToken, profile, cb) => {
  try {
    const email = profile.emails[0].value.toLowerCase().trim()
    const googleId = profile.id
    const name = profile.displayName
    const avatar = profile.photos[0]?.value || null
    const founderStatus = isFounderEmail(email)

    // Check if user already exists by email
    const existing = await pool.query(
      "SELECT id, profile_complete, google_id, is_founder FROM SyncLabUsers WHERE email = $1",
      [email]
    )

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      // Link google_id if not already linked
      if (!user.google_id) {
        await pool.query(
          "UPDATE SyncLabUsers SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), avatar = COALESCE(avatar, $2) WHERE id = $3",
          [googleId, avatar, user.id]
        )
      }
      const founderUpdate = await pool.query(
        `UPDATE SyncLabUsers
         SET is_founder = $1
         WHERE id = $2
         RETURNING id, profile_complete, is_founder`,
        [founderStatus, user.id]
      )
      const updatedUser = founderUpdate.rows[0]
      return cb(null, { id: updatedUser.id, profile_complete: updatedUser.profile_complete, is_founder: updatedUser.is_founder, email, name, avatar })
    }

    // New user — insert into DB
    const inserted = await pool.query(
      `INSERT INTO SyncLabUsers (email, google_id, display_name, avatar_url, avatar, profile_complete, is_founder)
       VALUES ($1, $2, $3, $4, $4, false, false)
       RETURNING id, profile_complete, is_founder`,
      [email, googleId, name, avatar]
    )
    const newUser = inserted.rows[0]
    return cb(null, { id: newUser.id, profile_complete: newUser.profile_complete, is_founder: newUser.is_founder, email, name, avatar })

  } catch (err) {
    return cb(err, null)
  }
}));

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }))

router.get("/google/callback", passport.authenticate("google", { failureRedirect: "http://localhost:5173/login" }),
  (req, res) => {
    const user = req.user
    const profileComplete = user.profile_complete ? "true" : "false"
    const founder = user.is_founder ? "true" : "false"
    // Pass user data to frontend via query params so React can store in localStorage
    res.redirect(
      `http://localhost:5173/auth/callback?user_id=${user.id}&profile_complete=${profileComplete}&is_founder=${founder}&name=${encodeURIComponent(user.name || "")}&email=${encodeURIComponent(user.email || "")}&avatar=${encodeURIComponent(user.avatar || "")}`
    )
  }
)

export default router;

