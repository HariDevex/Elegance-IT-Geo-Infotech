import { createClient } from "redis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient = null;
let isConnected = false;

export const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    console.log("Redis not configured, caching disabled");
    return false;
  }

  try {
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on("error", (err) => {
      console.error("Redis error:", err.message);
      isConnected = false;
    });

    redisClient.on("connect", () => {
      console.log("Redis connected");
      isConnected = true;
    });

    redisClient.on("reconnecting", () => {
      console.log("Redis reconnecting...");
    });

    await redisClient.connect();
    return true;
  } catch (error) {
    console.error("Redis connection failed:", error.message);
    return false;
  }
};

export const getRedisClient = () => redisClient;
export const isRedisConnected = () => isConnected;

export const cacheGet = async (key) => {
  if (!isConnected || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = 300) => {
  if (!isConnected || !redisClient) return false;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const cacheDelete = async (key) => {
  if (!isConnected || !redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch {
    return false;
  }
};

export const cacheDeletePattern = async (pattern) => {
  if (!isConnected || !redisClient) return false;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch {
    return false;
  }
};

export const cacheMiddleware = (options = {}) => {
  const { ttl = 300, keyPrefix = "" } = options;

  return async (req, res, next) => {
    if (!isConnected) return next();

    const key = `${keyPrefix}:${req.originalUrl}`;
    
    try {
      const cached = await cacheGet(key);
      if (cached) {
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode === 200) {
          cacheSet(key, data, ttl).catch(() => {});
        }
        return originalJson(data);
      };

      next();
    } catch {
      next();
    }
  };
};

export const sessionStore = {
  async get(id) {
    if (!isConnected) return null;
    try {
      const data = await redisClient.get(`session:${id}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  async set(id, session) {
    if (!isConnected) return;
    try {
      await redisClient.setEx(`session:${id}`, 86400, JSON.stringify(session));
    } catch { /* Redis operation failed silently */ }
  },
  async destroy(id) {
    if (!isConnected) return;
    try {
      await redisClient.del(`session:${id}`);
    } catch { /* Redis operation failed silently */ }
  },
};

export default {
  connectRedis,
  getRedisClient,
  isRedisConnected,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheMiddleware,
  sessionStore,
};
