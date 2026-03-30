import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  login,
  logout,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  resetPassword,
  uploadAvatar,
  getProfile,
  getLoginLogs,
  exportEmployeesExcel,
  exportAttendanceExcel,
  exportLoginLogsExcel,
  resetUserPassword,
  getPasswordHistory,
  getAllPasswordHistory,
  getSessions,
  terminateSession,
  terminateAllSessions,
} from "../controller/authController.js";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import { validate, sanitizeInput } from "../middleware/validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

const router = express.Router();

const loginSchema = {
  employee_id: { required: true, maxLength: 50 },
  password: { required: true, maxLength: 128 },
};

const changePasswordSchema = {
  oldPassword: { required: true, maxLength: 128 },
  newPassword: { required: true, minLength: 6, maxLength: 128 },
};

const forgotPasswordSchema = {
  employee_id: { required: true, maxLength: 50 },
};

router.post("/login", sanitizeInput, validate(loginSchema), login);

router.post("/logout", authMiddleware, logout);

router.post("/refresh", refreshAccessToken);

router.put(
  "/change-password",
  authMiddleware,
  sanitizeInput,
  validate(changePasswordSchema),
  changePassword
);

router.post("/forgot-password", sanitizeInput, validate(forgotPasswordSchema), forgotPassword);

router.post("/reset-password", resetPassword);

router.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);

router.get("/profile", authMiddleware, getProfile);

router.get("/login-logs", 
  authMiddleware,
  requireRole(ROLES.ROOT, ROLES.ADMIN), 
  getLoginLogs
);

router.get("/export/employees", 
  authMiddleware,
  requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), 
  exportEmployeesExcel
);

router.get("/export/attendance", 
  authMiddleware,
  requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), 
  exportAttendanceExcel
);

router.get("/export/login-logs", 
  authMiddleware,
  requireRole(ROLES.ROOT, ROLES.ADMIN), 
  exportLoginLogsExcel
);

router.post("/reset-user-password",
  authMiddleware,
  requireRole(ROLES.ROOT),
  sanitizeInput,
  resetUserPassword
);

router.get("/password-history",
  authMiddleware,
  requireRole(ROLES.ROOT),
  getPasswordHistory
);

router.get("/all-password-history",
  authMiddleware,
  requireRole(ROLES.ROOT),
  getAllPasswordHistory
);

router.get("/sessions",
  authMiddleware,
  getSessions
);

router.delete("/sessions/:sessionId",
  authMiddleware,
  terminateSession
);

router.delete("/sessions",
  authMiddleware,
  terminateAllSessions
);

export default router;
