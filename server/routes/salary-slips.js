import { Router } from "express";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import { generateSlip, listSlips, markDownloaded } from "../controller/salarySlipController.js";

const router = Router();

router.use(authMiddleware);

router.post("/generate", requireRole(ROLES.ROOT, ROLES.ADMIN, ROLES.MANAGER), generateSlip);
router.get("/", listSlips);
router.put("/:id/download", markDownloaded);

export default router;
