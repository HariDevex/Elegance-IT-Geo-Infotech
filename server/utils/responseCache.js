class ResponseCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000;
  }

  generateKey(prefix, params) {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()).slice(0, 10),
    };
  }
}

const responseCache = new ResponseCache();

setInterval(() => responseCache.cleanup(), 60 * 1000);

export const cacheMiddleware = (options = {}) => {
  const { ttl = 300000, keyPrefix = "api" } = options;

  return (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = responseCache.generateKey(keyPrefix, {
      path: req.path,
      query: req.query,
      user: req.user?._id,
    });

    const cached = responseCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) {
        responseCache.set(cacheKey, data, ttl);
      }
      return originalJson(data);
    };

    next();
  };
};

export const invalidateCache = (pattern) => {
  responseCache.invalidate(pattern);
};

export default responseCache;
