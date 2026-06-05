import fs from "fs";
import path from "path";

const logDir = "./logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logError = (err, req) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
  };

  const logFile = path.join(logDir, `error-${new Date().toISOString().split("T")[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");

  if (process.env.NODE_ENV !== "production") {
    console.error(`[${timestamp}] ${req.method} ${req.originalUrl}`, err);
  }
};

export const errorHandler = (err, req, res, _next) => {
  logError(err, req);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: err.message || "Validation failed",
    });
  }

  if (err.name === "CastError" || err.message?.includes("ObjectId") || err.message?.includes("invalid input syntax")) {
    return res.status(404).json({
      success: false,
      error: "Resource not found",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Token expired",
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON format",
    });
  }

  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      error: "Record already exists",
    });
  }

  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      error: "Invalid reference",
    });
  }

  if (err.statusCode === 400 || err.status === 400) {
    return res.status(400).json({
      success: false,
      error: err.message || "Bad request",
    });
  }

  if (err.statusCode === 404 || err.status === 404) {
    return res.status(404).json({
      success: false,
      error: err.message || "Resource not found",
    });
  }

  if (err.name === "Error" && err.message?.includes("not found")) {
    return res.status(404).json({
      success: false,
      error: err.message,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : message,
  });
};

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 1000 || res.statusCode >= 400) {
      const logFile = path.join(logDir, `request-${new Date().toISOString().split("T")[0]}.log`);
      const entry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      };
      fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
    }
  });

  next();
};
