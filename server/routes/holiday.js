import express from "express";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import { getHolidays, createHoliday, deleteHoliday, getUpcomingHolidays, autoPopulateHolidays } from "../controller/holidayController.js";

const router = express.Router();

router.get("/", authMiddleware, getHolidays);

router.get("/upcoming", authMiddleware, getUpcomingHolidays);

router.post("/auto-populate", authMiddleware, autoPopulateHolidays);

router.post("/", authMiddleware, requireRole(ROLES.ROOT, ROLES.ADMIN), createHoliday);

router.delete("/:id", authMiddleware, deleteHoliday);

export default router;
