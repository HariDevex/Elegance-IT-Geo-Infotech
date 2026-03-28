import jwt from "jsonwebtoken";
import { config } from "../config/appConfig.js";

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

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    req.user.role = decoded.role;
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
    console.log('[DEBUG requireRole] userRole:', userRole, 'allowedRoles:', allowedRoles, 'req.user:', req.user);
    
    if (!userRole) {
      return res.status(401).json({
        success: false,
        error: "User role not found.",
      });
    }
    
    // Root always has access
    if (userRole === "root") {
      return next();
    }
    
    if (!allowedRoles.includes(userRole)) {
      console.log('[DEBUG requireRole] Access denied for role:', userRole, 'allowed:', allowedRoles);
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

const canManageUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required.",
    });
  }

  const userRole = req.user.role;
  const targetUserId = req.params.id;
  const isSelf = req.user._id === targetUserId;

  if (userRole === ROLES.ROOT) {
    return next();
  }

  if (userRole === ROLES.ADMIN || userRole === ROLES.MANAGER || userRole === ROLES.HR) {
    return next();
  }

  if (isSelf) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: "Access denied. You can only manage your own profile.",
  });
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
