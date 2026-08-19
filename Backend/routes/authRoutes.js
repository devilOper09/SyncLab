import express from "express";
import { signup, login } from "../controllers/authController.js";
import { arcjetMiddleware, authRateLimitRule } from "../utils/arcjet.js";

const router = express.Router()

router.post("/signup", arcjetMiddleware([authRateLimitRule]), signup)
router.post("/login", arcjetMiddleware([authRateLimitRule]), login)

export default router;