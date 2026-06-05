import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import RateLimitRedisStore from "rate-limit-redis";
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
import leaveBalanceRouter from "./routes/leave-balance.js";
import notificationRouter from "./routes/notification.js";
import holidayRouter from "./routes/holiday.js";
import documentRouter from "./routes/document.js";
import folderRouter from "./routes/folder.js";
import activityLogRouter from "./routes/activity-logs.js";
import twoFactorRouter from "./routes/two-factor.js";
import oauthRouter from "./routes/oauth.js";
import payrollRouter from "./routes/payroll.js";
import salarySlipRouter from "./routes/salary-slips.js";
import resignationRouter from "./routes/resignation.js";
import onboardingRouter from "./routes/onboarding.js";
import { cacheMiddleware } from "./utils/responseCache.js";
import { cacheMiddleware as redisCacheMiddleware, connectRedis, isRedisConnected, getRedisClient } from "./utils/redis.js";
import { errorHandler, requestLogger } from "./middleware/errorHandler.js";
import { validateInputLength } from "./middleware/validator.js";
import { initSentry, sentryErrorHandler } from "./utils/sentry.js";
import { initSocketIO } from "./utils/socket.js";
import { register, httpRequestDurationMicroseconds, activeRequests } from "./core/metrics.js";
import logger from "./utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

logger.info("=== Server Startup ===");
logger.info(`PORT: ${PORT}`);
logger.info(`HOST: ${HOST}`);
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
logger.info(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);
logger.info(`REDIS_URL set: ${!!process.env.REDIS_URL}`);

const app = express();

const frontendDistPath = path.resolve(__dirname, "../Frontend/dist");

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// --- HTTPS support -------------------------------------------------------
// Toggle via USE_HTTPS=true. Defaults to HTTP to avoid reverse-proxy 502s when upstream expects plain HTTP.
const USE_HTTPS = process.env.USE_HTTPS === "true";
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.resolve(__dirname, "ssl/server.crt");
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.resolve(__dirname, "ssl/server.key");
const certsPresent = fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH);
const enableHttps = USE_HTTPS && certsPresent;

let server;
let redirectServer;

if (USE_HTTPS) {
  if (!certsPresent) {
    logger.warn("⚠️ USE_HTTPS=true but certificate files are missing; falling back to HTTP.");
    server = http.createServer(app);
  } else {
    const sslOptions = {
      cert: fs.readFileSync(SSL_CERT_PATH),
      key: fs.readFileSync(SSL_KEY_PATH),
    };
    server = https.createServer(sslOptions, app);
    // optional HTTP->HTTPS redirect on port 80
    redirectServer = http.createServer((req, res) => {
      const host = (req.headers.host || "").split(":")[0];
      const targetPort = PORT === 443 ? "" : `:${PORT}`;
      res.writeHead(301, { Location: `https://${host}${targetPort}${req.url}` });
      res.end();
    });
    logger.info("✅ HTTPS enabled using provided certificate");
  }
} else {
  server = http.createServer(app);
  logger.info("ℹ️ USE_HTTPS not set; running over HTTP (expect TLS at proxy)");
}

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
      connectSrc: ["'self'", "https:", "wss:", "ws:", "https://elegance-it-geo-infotech.onrender.com", "wss://elegance-it-geo-infotech.onrender.com"],
    },
  },
}));

const corsOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:8081",
  "http://192.168.1.10:8081",
  "https://192.168.1.10:8081",
  "https://elegance-it-geo-infotech-3onp6wpyx-harizencodedevs-projects.vercel.app",
  "https://elegance-it-geo-infotech.onrender.com",
].filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Content-Length"],
    credentials: true,
  })
);

const makeRateLimiter = (opts) => {
  const redisClient = getRedisClient();
  const store = redisClient?.isOpen
    ? new RateLimitRedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) })
    : undefined;
  return rateLimit({ store, ...opts });
};

const sensitivePaths = ["/api/employees", "/api/leaves", "/api/announcements"];

const globalLimiter = makeRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 1000 : 50000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: "Too many requests, please try again later." },
  skip: (req) => sensitivePaths.some((p) => req.path.startsWith(p)),
});
app.use("/api/", globalLimiter);

const authLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: "Too many login attempts, please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

const sensitiveEndpointLimiter = makeRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 200 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: "Too many requests, please try again later." },
});

app.use("/api/employees", sensitiveEndpointLimiter);
app.use("/api/leaves", sensitiveEndpointLimiter);
app.use("/api/announcements", sensitiveEndpointLimiter);

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

app.use((req, res, next) => {
  activeRequests.inc();
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on("finish", () => {
    activeRequests.dec();
    end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
  });
  next();
});

const useRedis = () => isRedisConnected();

app.use("/api/holidays", useRedis() ? redisCacheMiddleware({ ttl: 300, keyPrefix: "holidays" }) : cacheMiddleware({ ttl: 60000, keyPrefix: "holidays" }));
app.use("/api/announcements", useRedis() ? redisCacheMiddleware({ ttl: 120, keyPrefix: "announcements" }) : cacheMiddleware({ ttl: 30000, keyPrefix: "announcements" }));
app.use("/api/leave-balance", useRedis() ? redisCacheMiddleware({ ttl: 300, keyPrefix: "leave-balance" }) : cacheMiddleware({ ttl: 60000, keyPrefix: "leave-balance" }));
app.use("/api/attendance", useRedis() ? redisCacheMiddleware({ ttl: 60, keyPrefix: "attendance" }) : cacheMiddleware({ ttl: 15000, keyPrefix: "attendance" }));
app.use("/api/leaves", useRedis() ? redisCacheMiddleware({ ttl: 60, keyPrefix: "leaves" }) : cacheMiddleware({ ttl: 15000, keyPrefix: "leaves" }));
app.use("/api/activity-logs", useRedis() ? redisCacheMiddleware({ ttl: 120, keyPrefix: "activity-logs" }) : cacheMiddleware({ ttl: 30000, keyPrefix: "activity-logs" }));

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

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
app.use("/api/folders", folderRouter);
app.use("/api/activity-logs", activityLogRouter);
app.use("/api/auth/2fa", twoFactorRouter);
app.use("/api/auth/oauth", oauthRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/salary-slips", salarySlipRouter);
app.use("/api/resignations", resignationRouter);
app.use("/api/onboarding", onboardingRouter);

app.get("/api/health", async (req, res) => {
  const checks = { websocket: true, redis: false, database: false, sentry: !!process.env.SENTRY_DSN };

  try {
    const redisClient = getRedisClient();
    checks.redis = redisClient?.isOpen === true;
  } catch { /* redis not available */ }

  try {
    const db = (await import("./config/database.js")).default;
    await db.raw("SELECT 1");
    checks.database = true;
  } catch { /* db not reachable */ }

  const healthy = checks.redis || !process.env.REDIS_URL;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "Server is healthy" : "Server degraded — some services unavailable",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    features: checks,
  });
});

app.get("/health", async (req, res) => {
  try {
    const db = (await import("./config/database.js")).default;
    await db.raw("SELECT 1");
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", timestamp: new Date().toISOString() });
  }
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

const REDIRECT_PORT = process.env.REDIRECT_PORT || 80;

logger.info("All imports completed successfully");
logger.info("Starting server initialization...");

const startServer = async () => {
  try {
    const redisConnected = await connectRedis();
    if (redisConnected) {
      logger.info("Redis connection initialized");
    } else {
      logger.info("Redis not configured, continuing without Redis");
    }

    initSocketIO(server);
    logger.info("Socket.io initialized");

    server.listen(PORT, HOST, () => {
      const scheme = enableHttps ? "https" : "http";
      logger.info(`🚀 Server running on ${scheme}://${HOST}:${PORT}`);
      logger.info(`📚 API available at ${scheme}://${HOST}:${PORT}/api`);
      logger.info(`🔌 WebSocket available at ${scheme}://${HOST}:${PORT}`);
      if (fs.existsSync(frontendDistPath)) {
        logger.info(`🌐 Frontend available at ${scheme}://${HOST}:${PORT}`);
      }
    });

    if (redirectServer) {
      redirectServer.listen(REDIRECT_PORT, HOST, () => {
        logger.info(`↪️  HTTP to HTTPS redirect enabled on http://${HOST}:${REDIRECT_PORT}`);
      });
    }
  } catch (error) {
    logger.error("=== STARTUP ERROR ===");
    logger.error("Error:", error);
    logger.error("Error message:", error?.message);
    logger.error("Error stack:", error?.stack);
    
    if (server) {
      server.listen(PORT, HOST, () => {
        logger.info(`Server running on http://${HOST}:${PORT}`);
      });
    } else {
      logger.error("Server object not created. Check HTTPS/SSL configuration.");
      process.exit(1);
    }
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
