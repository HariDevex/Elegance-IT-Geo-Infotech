import express from "express";
import authMiddleware from "../middleware/auth.js";
import { getAttendanceInsights } from "../utils/aiAttendance.js";
import { handleChat, clearChat } from "../utils/aiChatbot.js";
import { smartSearch } from "../utils/aiSearch.js";
import { getLeavePrediction } from "../utils/aiLeavePrediction.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/attendance-insights", getAttendanceInsights);

router.get("/search", smartSearch);

router.get("/leave-prediction", getLeavePrediction);

router.post("/chat", handleChat);

router.delete("/chat/:conversationId", clearChat);

export default router;
