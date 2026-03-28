import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";
import fs from "fs";

import authRouter from "./routes/auth.js";
import employeeRouter from "./routes/employee.js";
import attendanceRouter from "./routes/attendance.js";
import leaveRouter from "./routes/leave.js";
import chatRouter from "./routes/chat.js";
import announcementRouter from "./routes/announcement.js";
import checkinRouter from "./routes/checkin.js";
import leaveBalanceRouter from "./routes/leaveBalance.js";
import notificationRouter from "./routes/notification.js";
import holidayRouter from "./routes/holiday.js";
import documentRouter from "./routes/document.js";
import activityLogRouter from "./routes/activityLog.js";
import twoFactorRouter from "./routes/twoFactor.js";
import oauthRouter from "./routes/oauth.js";
import { errorHandler, requestLogger } from "./middleware/errorHandler.js";
import { validateInputLength } from "./middleware/validator.js";
import { initSentry, sentryErrorHandler } from "./utils/sentry.js";
import { connectRedis } from "./utils/redis.js";
import { initSocketIO } from "./utils/socket.js";
import logger from "./utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

const frontendDistPath = path.resolve(__dirname, "../Frontend/dist");

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

const server = http.createServer(app);

app.set('trust proxy', 1);

initSentry(app);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https:"],
    },
  },
}));

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "*",
      "http://192.168.29.205",
      "https://192.168.29.205",
      "http://192.168.29.205:5173",
      "https://192.168.29.205:5173",
      "http://192.168.29.205:3000",
      "https://192.168.29.205:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Content-Length"],
    credentials: true,
  })
);

const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: "Too many requests, please try again later." },
});
app.use("/api/", globalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: "Too many login attempts, please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

app.use(express.json({ 
  limit: "50mb",
  strict: true,
}));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON format",
    });
  }
  next(err);
});

app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/", validateInputLength);

app.use(compression());

app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res) => {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));

app.use(requestLogger);

app.use("/api/auth", authRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/leaves", leaveRouter);
app.use("/api/chat", chatRouter);
app.use("/api/announcements", announcementRouter);
app.use("/api/checkin", checkinRouter);
app.use("/api/leave-balance", leaveBalanceRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/holidays", holidayRouter);
app.use("/api/documents", documentRouter);
app.use("/api/activity-logs", activityLogRouter);
app.use("/api/auth/2fa", twoFactorRouter);
app.use("/api/auth/oauth", oauthRouter);

app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    features: {
      websocket: true,
      redis: true,
      sentry: !!process.env.SENTRY_DSN,
    }
  });
});

if (fs.existsSync(frontendDistPath)) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ success: false, error: "Route not found" });
  });
}

sentryErrorHandler(app);
app.use(errorHandler);

const PORT = process.env.PORT || 443;
const HOST = process.env.HOST || "0.0.0.0";

const startServer = async () => {
  try {
    await connectRedis();
    logger.info("Redis connection initialized");

    initSocketIO(server);
    logger.info("Socket.io initialized");

    server.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`📚 API available at http://${HOST}:${PORT}/api`);
      logger.info(`🔌 WebSocket available at http://${HOST}:${PORT}`);
      if (fs.existsSync(frontendDistPath)) {
        logger.info(`🌐 Frontend available at http://${HOST}:${PORT}`);
      }
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT} (without optional features)`);
    });
  }
};

startServer();

export default app;
