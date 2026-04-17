import express from "express";
import authMiddleware from "../middleware/auth.js";
import { getBalances, setBalance, getLeaveTypes } from "../controller/leaveBalanceController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/types", getLeaveTypes);

router.get("/balance", getBalances);
router.get("/balance/:userId", getBalances);

router.put("/balance", setBalance);

export default router;
