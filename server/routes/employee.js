import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import authMiddleware, { 
  requireRole, 
  requireMinRole, 
  canManageUser,
  ROLES 
} from "../middleware/auth.js";
import {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  updateAttendance,
  deleteEmployee,
} from "../controller/employeeController.js";
import { validate, sanitizeInput, validateUUID } from "../middleware/validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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

const createEmployeeSchema = {
  name: { required: true, minLength: 2, maxLength: 100 },
  email: { type: "email", maxLength: 255 },
  password: { required: true, minLength: 6, maxLength: 128 },
  role: {
    required: true,
    enum: ["admin", "manager", "teamlead", "developer", "hr"],
  },
  designation: { maxLength: 100 },
  department: { maxLength: 100 },
  branch: { maxLength: 100 },
};

router.use(authMiddleware);

router.get("/:id", validateUUID("id"), getEmployee);

router.post("/", 
  requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER, ROLES.HR), 
  upload.single("profileImage"), 
  sanitizeInput, 
  validate(createEmployeeSchema), 
  createEmployee
);

router.get("/", 
  listEmployees
);

router.put("/:id", 
  validateUUID("id"),
  canManageUser, 
  sanitizeInput, 
  upload.single("profileImage"), 
  updateEmployee
);

router.put("/:id/attendance", 
  validateUUID("id"),
  requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), 
  updateAttendance
);

router.delete("/:id", 
  validateUUID("id"),
  requireRole(ROLES.ROOT, ROLES.ADMIN), 
  deleteEmployee
);

export default router;
