import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/node";
import dotenv from "dotenv";

dotenv.config();

// Base rules applied to every request
const baseRules = [
  shield({ mode: "LIVE" }),
  detectBot({
    mode: "LIVE",
    allow: ["CATEGORY:SEARCH_ENGINE"],
  }),
];

// Helper middleware to run Arcjet on specific endpoints
export const arcjetMiddleware = (customRules = []) => {
  return async (req, res, next) => {
    try {
      // If ARCJET_KEY is not configured, skip to avoid blocking
      if (!process.env.ARCJET_KEY) {
        return next();
      }

      const client = arcjet({
        key: process.env.ARCJET_KEY,
        characteristics: ["ip.src"],
        rules: [...baseRules, ...customRules],
      });

      const decision = await client.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later.",
          });
        }
        if (decision.reason.isBot()) {
          return res.status(403).json({
            success: false,
            message: "Access denied. Bot activity detected.",
          });
        }
        return res.status(403).json({
          success: false,
          message: "Access denied.",
        });
      }

      next();
    } catch (err) {
      console.error("Arcjet error:", err);
      // Fail open in production/development so we don't block users if Arcjet is down
      next();
    }
  };
};

// Specific rate limit rules for different endpoints
export const authRateLimitRule = tokenBucket({
  mode: "LIVE",
  refillRate: 5, // 5 tokens refilled
  interval: "1m", // every 1 minute
  capacity: 10, // max 10 requests burst
});

export const moderateRateLimitRule = tokenBucket({
  mode: "LIVE",
  refillRate: 30, // 30 tokens refilled
  interval: "1m", // every 1 minute
  capacity: 60, // max 60 requests burst
});

export const generalRateLimitRule = tokenBucket({
  mode: "LIVE",
  refillRate: 100,
  interval: "1m",
  capacity: 200,
});
