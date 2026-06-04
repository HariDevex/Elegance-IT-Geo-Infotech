import express from "express";
import authMiddleware from "../middleware/auth.js";
import { checkin, checkout, getMyRecords, getAllCheckinRecords, exportCheckinExcel } from "../controller/checkinController.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/checkin", checkin);
router.post("/checkout", checkout);
router.get("/my-records", getMyRecords);
router.get("/all-records", getAllCheckinRecords);
router.get("/export", exportCheckinExcel);

export default router;
