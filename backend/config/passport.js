import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";

/* ================= ENV SETUP (CRITICAL) ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 Load .env explicitly for THIS file
dotenv.config({ path: path.join(__dirname, "../.env") });

/* ================= FACEBOOK STRATEGY ================= */
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "displayName", "emails"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Later: save/find user in DB
        return done(null, profile);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

/* ================= SESSION HANDLING ================= */
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
