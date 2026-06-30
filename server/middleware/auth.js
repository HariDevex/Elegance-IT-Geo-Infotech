import jwt from "jsonwebtoken";
import { config } from "../config/appConfig.js";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js";

const ROLES = {
  ROOT: "root",
  ADMIN: "admin",
  MANAGER: "manager",
  HR: "hr",
  TEAMLEAD: "teamlead",
  DEVELOPER: "developer",
};

const ROLE_HIERARCHY = {
  [ROLES.ROOT]: 6,
  [ROLES.ADMIN]: 5,
  [ROLES.MANAGER]: 4,
  [ROLES.HR]: 3,
  [ROLES.TEAMLEAD]: 2,
  [ROLES.DEVELOPER]: 1,
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        error: "Token has been revoked. Please login again.",
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    req.user.role = decoded.role;

    // Ensure we have the database UUID 'id', not just the 'employee_id' (_id)
    if (!req.user.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.user.id)) {
      const db = (await import("../config/database.js")).default;
      const user = await db("users")
        .where("employee_id", req.user._id || req.user.employee_id)
        .where("is_deleted", false)
        .select("id")
        .first();
        
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "User account not found or has been deleted.",
        });
      }
      req.user.id = user.id;
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired. Please login again.",
      });
    }
    res.status(401).json({
      success: false,
      error: "Invalid token.",
    });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    const userRole = req.user.role || req.user.user?.role;
    
    if (!userRole) {
      return res.status(401).json({
        success: false,
        error: "User role not found.",
      });
    }
    
    if (userRole === "root") {
      return next();
    }
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    const userRole = req.user.role || req.user.user?.role;
    
    // Root always has access
    if (userRole === "root") {
      return next();
    }
    
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

const canManageUser = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }

  const userRole = req.user.role;
  const targetUserId = req.params.id;
  const isSelf = req.user._id === targetUserId;

  if (userRole === ROLES.ROOT || isSelf) {
    return next();
  }

  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const MIN_MANAGE_LEVEL = ROLE_HIERARCHY[ROLES.MANAGER];

  if (userLevel < MIN_MANAGE_LEVEL) {
    return res.status(403).json({ success: false, error: "Access denied. You can only manage your own profile." });
  }

  try {
    const db = (await import("../config/database.js")).default;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const queryField = uuidRegex.test(targetUserId) ? "id" : "employee_id";
    const targetUser = await db("users").where(queryField, targetUserId).first();
    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0;
    if (userLevel > targetLevel) {
      return next();
    }
    return res.status(403).json({ success: false, error: "Access denied. You cannot manage users with equal or higher role." });
  } catch {
    return res.status(500).json({ success: false, error: "Error checking permissions" });
  }
};

const isAdminOrManager = requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER);
const isManagerOrAbove = requireMinRole(ROLES.MANAGER);
const isHR = requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.HR);
const isTeamLeadOrAbove = requireMinRole(ROLES.TEAMLEAD);

export {
  authMiddleware,
  requireRole,
  requireMinRole,
  canManageUser,
  isAdminOrManager,
  isManagerOrAbove,
  isHR,
  isTeamLeadOrAbove,
  ROLES,
  ROLE_HIERARCHY,
};

export default authMiddleware;
