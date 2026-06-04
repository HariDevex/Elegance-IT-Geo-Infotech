import { Router } from "express";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import { processPayroll, listPayroll, getPayroll, deletePayroll } from "../controller/payrollController.js";

const router = Router();

router.use(authMiddleware);

router.post("/", requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), processPayroll);
router.get("/", listPayroll);
router.get("/:id", getPayroll);
router.delete("/:id", requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), deletePayroll);

export default router;
