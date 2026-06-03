import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import bcrypt from "bcryptjs";
import db from "../config/database.js";
import jwt from "jsonwebtoken";

const initOAuth = () => {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db("users").where("id", id).first();
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await db("users").where("google_id", profile.id).first();
            
            if (!user) {
              user = await db("users").where("email", profile.emails[0].value).first();
              
              if (user) {
                await db("users").where("id", user.id).update({ google_id: profile.id });
              } else {
                const tempPassword = jwt.random ? require("crypto").randomBytes(16).toString("hex") : Math.random().toString(36).slice(2);
                const hashedPassword = await bcrypt.hash(tempPassword, 10);
                
                const [newUser] = await db("users")
                  .insert({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    password: hashedPassword,
                    google_id: profile.id,
                    role: "developer",
                    avatar: profile.photos[0]?.value,
                  })
                  .returning("*");
                user = newUser;
              }
            }

            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL || "/api/auth/github/callback",
          scope: ["user:email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            let user = await db("users").where("github_id", profile.id).first();

            if (!user && email) {
              user = await db("users").where("email", email).first();
              
              if (user) {
                await db("users").where("id", user.id).update({ github_id: profile.id });
              } else {
                const tempPassword = Math.random().toString(36).slice(2);
                const hashedPassword = await bcrypt.hash(tempPassword, 10);

                const [newUser] = await db("users")
                  .insert({
                    name: profile.displayName || profile.username,
                    email: email || `${profile.username}@github.local`,
                    password: hashedPassword,
                    github_id: profile.id,
                    role: "developer",
                    avatar: profile.photos?.[0]?.value,
                  })
                  .returning("*");
                user = newUser;
              }
            }

            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
  }
};

const oauthCallback = (req, res, next) => {
  passport.authenticate(req.params.provider, { session: false }, async (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }

    if (user.two_factor_enabled) {
      const tempToken = jwt.sign(
        { _id: user.id, type: "oauth_temp" },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
      );
      return res.redirect(`${process.env.FRONTEND_URL}/login?oauth=true&tempToken=${tempToken}`);
    }

    const token = jwt.sign(
      { _id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
  })(req, res, next);
};

const googleAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ success: false, error: "Google OAuth not configured" });
  }
  passport.authenticate("google", { session: false })(req, res, next);
};

const githubAuth = (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(501).json({ success: false, error: "GitHub OAuth not configured" });
  }
  passport.authenticate("github", { session: false })(req, res, next);
};

export { initOAuth, oauthCallback, googleAuth, githubAuth };
