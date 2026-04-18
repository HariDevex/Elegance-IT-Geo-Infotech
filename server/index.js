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

import knex from "knex";
import knexConfig from "./knexfile.js";

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
import aiRouter from "./routes/ai.js";
import { cacheMiddleware } from "./utils/responseCache.js";
import { errorHandler, requestLogger } from "./middleware/errorHandler.js";
import { validateInputLength } from "./middleware/validator.js";
import { initSentry, sentryErrorHandler } from "./utils/sentry.js";
import { connectRedis } from "./utils/redis.js";
import { initSocketIO } from "./utils/socket.js";
import logger from "./utils/logger.js";
import { securityMiddleware, aiThreatDetection } from "./utils/aiSecurity.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

console.log("=== Server Startup ===");
console.log(`PORT: ${PORT}`);
console.log(`HOST: ${HOST}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);
console.log(`REDIS_URL set: ${!!process.env.REDIS_URL}`);
console.log("========================");

const env = process.env.NODE_ENV || "development";
const db = knex(knexConfig[env]);

async function initDatabase() {
  try {
    console.log("🔄 Running database migrations...");
    await db.migrate.latest();
    console.log("✅ Migrations completed");

    const users = await db("users").count("* as count").first();
    if (users.count === 0) {
      console.log("🔄 Seeding database...");
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.default.hash("Rootadmmin@$123", 12);
      const employeeId = `EJB${new Date().getFullYear()}${(Math.floor(Math.random() * 900) + 100)}`;
      
      await db("users").insert({
        id: employeeId,
        name: "Admin",
        email: "rootharidevx@elegance.com",
        password: hashedPassword,
        role: "root",
        employee_id: employeeId,
        department: "Administration",
        designation: "System Administrator",
        is_active: true,
        failed_attempts: 0,
        login_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("✅ Database seeded with admin user");
    }
  } catch (error) {
    console.error("⚠️ Database initialization warning:", error.message);
    console.log("Continuing without database initialization...");
  }
}

initDatabase();

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
      connectSrc: ["'self'", "https:"],
    },
  },
}));

const corsOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:8081",
  "http://192.168.1.10:8081",
  "https://192.168.1.10:8081",
  "https://elegance-ems-haridevx.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Content-Length"],
    credentials: true,
  })
);

const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 500000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: "Too many requests, please try again later." },
});
app.use("/api/", globalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: "Too many login attempts, please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

const sensitiveEndpointLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5000,
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
app.use("/api/", securityMiddleware);

app.use("/api/holidays", cacheMiddleware({ ttl: 60000, keyPrefix: "holidays" }));
app.use("/api/announcements", cacheMiddleware({ ttl: 30000, keyPrefix: "announcements" }));
app.use("/api/leave-balance", cacheMiddleware({ ttl: 60000, keyPrefix: "leave-balance" }));

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
app.use("/api/ai", aiRouter);

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

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

if (fs.existsSync(frontendDistPath)) {
  app.get("{*path}", (req, res) => {
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

console.log("All imports completed successfully");
console.log("Starting server initialization...");

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
    console.error("=== STARTUP ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("====================");
    
    if (server) {
      server.listen(PORT, HOST, () => {
        console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      });
    } else {
      console.error("Server object not created. Check HTTPS/SSL configuration.");
      process.exit(1);
    }
  }
};

startServer();

export default app;
