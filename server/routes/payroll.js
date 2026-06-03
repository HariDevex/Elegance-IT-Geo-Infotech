import { Router } from "express";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import { processPayroll, listPayroll, getPayroll, deletePayroll } from "../controller/payrollController.js";

const router = Router();

router.post("/", authMiddleware, requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), processPayroll);
router.get("/", authMiddleware, listPayroll);
router.get("/:id", authMiddleware, getPayroll);
router.delete("/:id", authMiddleware, requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), deletePayroll);

export default router;
