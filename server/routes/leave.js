import express from "express";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import {
  createLeave,
  listLeaves,
  updateLeaveStatus,
  deleteLeave,
} from "../controller/leaveController.js";
import { validate } from "../middleware/validate.js";
import { sanitizeInput } from "../middleware/validator.js";
import { leaveRequestSchema, leaveStatusSchema } from "../modules/leaves/leaves.schema.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", sanitizeInput, validate(leaveRequestSchema), createLeave);

router.get("/", listLeaves);

router.put("/:id/status", 
  requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), 
  validate(leaveStatusSchema),
  updateLeaveStatus
);

router.delete("/:id", deleteLeave);

export default router;
