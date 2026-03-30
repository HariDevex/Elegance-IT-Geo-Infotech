import db from "../config/database.js";
import logger from "./logger.js";

const THREAT_PATTERNS = {
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /('|"|;|--|\/\*|\*\/|xp_|sp_|waitfor|delay)/i,
    /(union\s+select|or\s+1\s*=\s*1|and\s+1\s*=\s*1)/i,
    /(\bor\b.*\b=\b|\band\b.*\b=\b)/i,
    /(;\s*(select|insert|update|delete|drop))/i,
  ],
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+onerror/gi,
    /<svg[^>]*onload/gi,
    /eval\s*\(/gi,
    /document\.cookie/gi,
  ],
  pathTraversal: [
    /(\.\.\/|\.\.\\)/,
    /(\/etc\/passwd|\/etc\/shadow)/i,
    /(windows\s*\\system32)/i,
  ],
  commandInjection: [
    /(\||&|;|`|\$\()/,
    /(rm\s+-rf|mkfs|nc\s+-e|wget|curl.*\|)/i,
  ],
};

const RISK_WEIGHTS = {
  sqlInjection: 80,
  xss: 70,
  pathTraversal: 90,
  commandInjection: 95,
  multipleFailedLogins: 60,
  unusualTimeLogin: 30,
  unusualLocation: 50,
  rapidRequests: 40,
  newDevice: 35,
};

class AISecurityEngine {
  constructor() {
    this.threatLog = [];
    this.anomalyScores = new Map();
    this.requestHistory = new Map();
  }

  analyzeInput(input) {
    const threats = [];
    const inputStr = typeof input === "string" ? input : JSON.stringify(input);

    for (const [type, patterns] of Object.entries(THREAT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(inputStr)) {
          threats.push({
            type,
            score: RISK_WEIGHTS[type],
            pattern: pattern.source,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return {
      isThreat: threats.length > 0,
      threats,
      riskScore: threats.reduce((sum, t) => sum + t.score, 0),
    };
  }

  calculateAnomalyScore(userId, eventType, metadata = {}) {
    const key = `${userId}:${eventType}`;
    const now = new Date();
    const hour = now.getHours();

    let score = 0;

    if (eventType === "login") {
      if (hour >= 0 && hour < 6) {
        score += RISK_WEIGHTS.unusualTimeLogin;
      }

      if (metadata.newDevice) {
        score += RISK_WEIGHTS.newDevice;
      }

      if (metadata.unusualLocation) {
        score += RISK_WEIGHTS.unusualLocation;
      }
    }

    if (eventType === "rapid_request") {
      const userKey = `requests:${userId}`;
      const recent = this.requestHistory.get(userKey) || [];
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      const recentCount = recent.filter(t => new Date(t) > oneMinuteAgo).length;

      if (recentCount > 50) {
        score += RISK_WEIGHTS.rapidRequests * (recentCount / 50);
      }

      recent.push(now.toISOString());
      this.requestHistory.set(userKey, recent.slice(-100));
    }

    const currentScore = this.anomalyScores.get(userId) || 0;
    const newScore = Math.min(100, currentScore + score);
    this.anomalyScores.set(userId, newScore);

    setTimeout(() => {
      const score = this.anomalyScores.get(userId) || 0;
      this.anomalyScores.set(userId, Math.max(0, score - 5));
    }, 3600000);

    return {
      score,
      isAnomalous: score > 50,
      factors: metadata,
    };
  }

  async detectBruteForce(ip, userAgent) {
    const oneHourAgo = new Date(Date.now() - 3600000);

    const failedLogins = await db("login_attempts")
      .where("ip_address", ip)
      .where("success", false)
      .where("created_at", ">", oneHourAgo)
      .count("* as count")
      .first();

    const attempts = parseInt(failedLogins?.count || 0);

    return {
      isBruteForce: attempts >= 10,
      attempts,
      shouldBlock: attempts >= 20,
      riskLevel: attempts >= 20 ? "critical" : attempts >= 10 ? "high" : "low",
    };
  }

  async analyzeLoginPattern(userId, ip, userAgent) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentLogins = await db("login_sessions")
      .where("user_id", userId)
      .where("created_at", ">", sevenDaysAgo)
      .orderBy("created_at", "desc")
      .limit(10);

    const ipAddresses = new Set(recentLogins.map(s => s.ip_address));
    const userAgents = new Set(recentLogins.map(s => s.user_agent));

    const isNewDevice = !userAgents.has(userAgent);
    const isNewIP = !ipAddresses.has(ip);

    const anomalyScore = this.calculateAnomalyScore(userId, "login", {
      newDevice: isNewDevice,
      unusualLocation: isNewIP && recentLogins.length > 3,
      loginCount: recentLogins.length,
    });

    return {
      isNewDevice,
      isNewIP,
      anomalyScore: anomalyScore.score,
      riskLevel: anomalyScore.score > 70 ? "high" : anomalyScore.score > 40 ? "medium" : "low",
      previousLocations: ipAddresses.size,
    };
  }

  async logSecurityEvent(userId, eventType, severity, details) {
    try {
      await db("activity_logs").insert({
        user_id: userId,
        action: eventType,
        module: "security",
        details: JSON.stringify(details),
        ip_address: details.ip,
        created_at: db.fn.now(),
      });

      this.threatLog.push({
        userId,
        eventType,
        severity,
        details,
        timestamp: new Date().toISOString(),
      });

      if (this.threatLog.length > 1000) {
        this.threatLog = this.threatLog.slice(-500);
      }
    } catch (error) {
      logger.error("Failed to log security event", { error: error.message });
    }
  }

  getThreatIntelligence(ip) {
    const recentThreats = this.threatLog.filter(
      t => t.details?.ip === ip && new Date(t.timestamp) > new Date(Date.now() - 3600000)
    );

    return {
      threatCount: recentThreats.length,
      severity: recentThreats.length > 5 ? "critical" : recentThreats.length > 2 ? "high" : "none",
      recentThreats: recentThreats.slice(-5),
    };
  }

  async generateRiskReport(userId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const loginAttempts = await db("login_attempts")
      .where("user_id", userId)
      .where("created_at", ">", oneDayAgo);

    const failedAttempts = loginAttempts.filter(a => !a.success).length;
    const successfulAttempts = loginAttempts.filter(a => a.success).length;

    const activityLogs = await db("activity_logs")
      .where("user_id", userId)
      .where("created_at", ">", oneDayAgo)
      .count("* as count")
      .first();

    const currentScore = this.anomalyScores.get(userId) || 0;

    return {
      userId,
      riskScore: Math.min(100, currentScore + (failedAttempts * 5)),
      failedLoginAttempts: failedAttempts,
      successfulLogins: successfulAttempts,
      activityCount: parseInt(activityLogs?.count || 0),
      accountAge: await this.getAccountAge(userId),
      lastSecurityAlert: this.threatLog
        .filter(t => t.userId === userId)
        .slice(-1)[0]?.timestamp,
      recommendation: this.getRecommendation(currentScore, failedAttempts),
    };
  }

  async getAccountAge(userId) {
    const user = await db("users")
      .where("id", userId)
      .select("created_at")
      .first();

    if (!user) return null;

    const created = new Date(user.created_at);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  }

  getRecommendation(score, failedAttempts) {
    if (score > 80 || failedAttempts > 10) {
      return "IMMEDIATE_ACTION: Consider account suspension and password reset";
    }
    if (score > 50 || failedAttempts > 5) {
      return "WARNING: Monitor account activity closely";
    }
    if (score > 25) {
      return "CAUTION: Enable additional security measures";
    }
    return "NORMAL: Standard monitoring";
  }
}

const aiSecurity = new AISecurityEngine();

export const securityMiddleware = async (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", async () => {
    const duration = Date.now() - startTime;
    const riskScore = duration < 10 && req.method === "POST" ? 0 : aiSecurity.analyzeInput(req.body);

    if (riskScore.isThreat) {
      await aiSecurity.logSecurityEvent(
        req.user?._id || "anonymous",
        "THREAT_DETECTED",
        "high",
        {
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          threats: riskScore.threats,
          endpoint: req.originalUrl,
        }
      );

      logger.warn("Threat detected", {
        userId: req.user?._id,
        ip: req.ip,
        threats: riskScore.threats,
        endpoint: req.originalUrl,
      });
    }
  });

  next();
};

export const aiThreatDetection = (req, res, next) => {
  const inputToCheck = [
    req.body.name,
    req.body.email,
    req.body.reason,
    req.body.description,
    req.query.search,
    req.params.id,
  ].filter(Boolean).join(" ");

  const analysis = aiSecurity.analyzeInput(inputToCheck);

  if (analysis.isThreat && analysis.riskScore > 50) {
    logger.warn("High risk input detected", {
      ip: req.ip,
      riskScore: analysis.riskScore,
      threats: analysis.threats,
    });
  }

  req.securityAnalysis = analysis;
  next();
};

export default aiSecurity;
