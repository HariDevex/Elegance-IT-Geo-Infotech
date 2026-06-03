import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  createOrUpdateAttendance,
  listAttendance,
  listMyAttendance,
  generateQrToken,
  qrCheckin,
  geoCheckin,
} from "../controller/attendanceController.js";

const router = express.Router();

router.post("/", authMiddleware, createOrUpdateAttendance);

router.get("/my", authMiddleware, listMyAttendance);

router.get("/", authMiddleware, listAttendance);

router.post("/generate-qr", authMiddleware, generateQrToken);

router.post("/qr-checkin", authMiddleware, qrCheckin);

router.post("/geo-checkin", authMiddleware, geoCheckin);

export default router;
