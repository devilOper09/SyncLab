import dotenv from "dotenv"
import express, { Router } from "express"
import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
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
  callbackURL:"http://localhost:3000/auth/google/callback"
},
(accessToken, refreshToken, profile, cb) => {
  
    const user ={
        googleId:profile.id,
        name:profile.displayName,
        email:profile.emails[0].value,
        avatar:profile.photos[0].value
    }
    return cb(null, user)
}));

router.get("/google", passport.authenticate("google", {scope: ["profile","email" ],prompt:"select_account"}))

router.get("/google/callback", passport.authenticate("google", {failureRedirect: "/login"}),
    (req, res)=>{
        res.redirect("http://localhost:5173/home")
    }
)
export default router;

