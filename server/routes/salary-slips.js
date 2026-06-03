import { Router } from "express";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import { generateSlip, listSlips, markDownloaded } from "../controller/salarySlipController.js";

const router = Router();

router.post("/generate", authMiddleware, requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), generateSlip);
router.get("/", authMiddleware, listSlips);
router.put("/:id/download", authMiddleware, markDownloaded);

export default router;
