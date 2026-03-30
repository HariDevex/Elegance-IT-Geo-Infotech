import express from "express";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import {
  createLeave,
  listLeaves,
  updateLeaveStatus,
  deleteLeave,
} from "../controller/leaveController.js";
import { validate, sanitizeInput, validateUUID } from "../middleware/validator.js";

const router = express.Router();

const createLeaveSchema = {
  type: { 
    required: true,
    enum: ["Annual Leave", "Sick Leave", "Casual Leave", "unpaid"]
  },
  from: { required: true },
  to: { required: true },
  reason: { maxLength: 500 },
  notes: { maxLength: 1000 },
};

router.use(authMiddleware);

router.post("/", sanitizeInput, validate(createLeaveSchema), createLeave);

router.get("/", listLeaves);

router.put("/:id/status", 
  validateUUID("id"),
  requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), 
  updateLeaveStatus
);

router.delete("/:id", validateUUID("id"), deleteLeave);

export default router;
