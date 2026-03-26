import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  login,
  changePassword,
  forgotPassword,
  uploadAvatar,
  getProfile,
  getLoginLogs,
  exportEmployeesExcel,
  exportAttendanceExcel,
  exportLoginLogsExcel,
} from "../controller/authController.js";
import authMiddleware from "../middleware/auth.js";
import { validate, sanitizeInput } from "../middleware/validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
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
  email: { required: true, type: "email" },
  password: { required: true },
};

const changePasswordSchema = {
  oldPassword: { required: true },
  newPassword: { required: true, minLength: 6 },
};

const forgotPasswordSchema = {
  email: { required: true, type: "email" },
};

router.post("/login", sanitizeInput, validate(loginSchema), login);

router.put(
  "/change-password",
  authMiddleware,
  sanitizeInput,
  validate(changePasswordSchema),
  changePassword
);

router.post("/forgot-password", sanitizeInput, validate(forgotPasswordSchema), forgotPassword);

router.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);

router.get("/profile", authMiddleware, getProfile);

router.get("/login-logs", authMiddleware, getLoginLogs);

router.get("/export/employees", authMiddleware, exportEmployeesExcel);

router.get("/export/attendance", authMiddleware, exportAttendanceExcel);

router.get("/export/login-logs", authMiddleware, exportLoginLogsExcel);

export default router;
