import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

let sentryInitialized = false;

export const initSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    console.log("Sentry DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express(),
      new Sentry.Integrations.Knex(),
    ],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.exception) {
        console.error("Sentry captured error:", event.exception.values?.[0]?.value);
      }
      return event;
    },
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  
  sentryInitialized = true;
  
  return Sentry;
};

export const sentryErrorHandler = (app) => {
  if (!sentryInitialized || !process.env.SENTRY_DSN) {
    console.log("Sentry not initialized, skipping error handler");
    return;
  }
  
  app.use(Sentry.Handlers.errorHandler((err, req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const errorId = err.sentry || Sentry.captureException(err);

    console.error(`Error ${statusCode}:`, err.message);

    if (statusCode === 500) {
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        errorId: errorId,
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }

    res.status(statusCode).json({
      success: false,
      error: err.message || "An error occurred",
      errorId: statusCode >= 500 ? errorId : undefined,
    });
  }));
};

export const captureError = (error, context = {}) => {
  if (sentryInitialized && process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
  console.error("Error:", error.message, context);
};

export const captureMessage = (message, level = "info") => {
  if (sentryInitialized && process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
  console.log(`[${level}] ${message}`);
};

export const setUserContext = (user) => {
  if (sentryInitialized && process.env.SENTRY_DSN && user) {
    Sentry.setUser({
      id: user._id || user.id,
      email: user.email,
      username: user.name,
    });
  }
};

export const addBreadcrumb = (message, data = {}) => {
  if (sentryInitialized && process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      data,
      timestamp: Date.now(),
    });
  }
};

export default {
  initSentry,
  sentryErrorHandler,
  captureError,
  captureMessage,
  setUserContext,
  addBreadcrumb,
};
