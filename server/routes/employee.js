import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/auth.js";
import {
  createEmployee,
  listEmployees,
  updateEmployee,
  updateAttendance,
  deleteEmployee,
} from "../controller/employeeController.js";
import { validate, sanitizeInput } from "../middleware/validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
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
  name: { required: true, minLength: 2 },
  email: { required: true, type: "email" },
  password: { required: true, minLength: 6 },
  role: {
    required: true,
    enum: ["admin", "manager", "teamlead", "developer", "hr"],
  },
};

router.use(authMiddleware);

router.post("/", upload.single("profileImage"), sanitizeInput, validate(createEmployeeSchema), createEmployee);

router.get("/", listEmployees);

router.put("/:id", sanitizeInput, upload.single("profileImage"), updateEmployee);

router.put("/:id/attendance", updateAttendance);

router.delete("/:id", deleteEmployee);

export default router;
