import db from "../config/database.js";
import crypto from "crypto";
import { resolveUserId } from "../utils/dbUtils.js";
import { getProjectToday } from "../utils/dateUtils.js";

const DEFAULT_LEAVE_TYPES = [
  { type: "annual", label: "Annual Leave", defaultDays: 18 },
  { type: "sick", label: "Sick Leave", defaultDays: 10 },
  { type: "casual", label: "Casual Leave", defaultDays: 6 },
  { type: "unpaid", label: "Unpaid Leave", defaultDays: 0 },
];

const getOrCreateBalance = async (userId, leaveType, year) => {
  let balance = await db("leave_balances")
    .where("user_id", userId)
    .where("leave_type", leaveType)
    .where("year", year)
    .first();

  if (!balance) {
    const leaveConfig = DEFAULT_LEAVE_TYPES.find(l => l.type === leaveType) || { defaultDays: 0 };
    const id = crypto.randomUUID();
    await db("leave_balances")
      .insert({
        id,
        user_id: userId,
        leave_type: leaveType,
        total_days: leaveConfig.defaultDays,
        used_days: 0,
        pending_days: 0,
        year,
      });
    balance = await db("leave_balances").where("id", id).first();
  }

  return balance;
};

const initializeUserBalances = async (userId) => {
  const year = getProjectToday().getFullYear();
  for (const leave of DEFAULT_LEAVE_TYPES) {
    await getOrCreateBalance(userId, leave.type, year);
  }
};

const getBalances = async (req, res, next) => {
  try {
    const year = req.query.year || getProjectToday().getFullYear();
    const inputId = req.params.userId || req.user.id;

    const resolvedId = await resolveUserId(inputId);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const balances = await db("leave_balances")
      .where("user_id", resolvedId)
      .where("year", year)
      .orderBy("leave_type");

    if (balances.length === 0) {
      await initializeUserBalances(resolvedId);
      const newBalances = await db("leave_balances")
        .where("user_id", resolvedId)
        .where("year", year)
        .orderBy("leave_type");

      const formatted = newBalances.map(b => ({
        _id: b.id,
        leaveType: b.leave_type,
        totalDays: b.total_days,
        usedDays: b.used_days,
        pendingDays: b.pending_days,
        availableDays: b.total_days - b.used_days - b.pending_days,
        year: b.year,
      }));
      return res.json({ success: true, balances: formatted });
    }

    const formatted = balances.map(b => ({
      _id: b.id,
      leaveType: b.leave_type,
      totalDays: b.total_days,
      usedDays: b.used_days,
      pendingDays: b.pending_days,
      availableDays: b.total_days - b.used_days - b.pending_days,
      year: b.year,
    }));

    res.json({ success: true, balances: formatted });
  } catch (error) {
    next(error);
  }
};

const updateBalance = async (userId, leaveType, days, year, increment = true) => {
  const balance = await getOrCreateBalance(userId, leaveType, year);
  const currentUsed = balance.used_days || 0;
  const newUsed = increment ? currentUsed + days : currentUsed - days;
  
  await db("leave_balances")
    .where("id", balance.id)
    .update({
      used_days: newUsed,
      updated_at: db.fn.now(),
    });
};

const updatePendingBalance = async (userId, leaveType, days, year, increment = true) => {
  const balance = await getOrCreateBalance(userId, leaveType, year);
  const currentPending = balance.pending_days || 0;
  const newPending = increment ? currentPending + days : currentPending - days;
  
  await db("leave_balances")
    .where("id", balance.id)
    .update({
      pending_days: newPending,
      updated_at: db.fn.now(),
    });
};

const setBalance = async (req, res, next) => {
  try {
    const { userId, leaveType, totalDays, year } = req.body;
    const targetYear = year || getProjectToday().getFullYear();

    if (!["root", "admin", "manager", "teamlead", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const resolvedId = await resolveUserId(userId);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const balance = await getOrCreateBalance(resolvedId, leaveType, targetYear);

    await db("leave_balances")
      .where("id", balance.id)
      .update({
        total_days: totalDays,
        updated_at: db.fn.now(),
      });

    res.json({ success: true, message: "Balance updated" });
  } catch (error) {
    next(error);
  }
};

const getLeaveTypes = (req, res) => {
  res.json({ success: true, types: DEFAULT_LEAVE_TYPES });
};

export { 
  getBalances, 
  setBalance, 
  getLeaveTypes,
  updateBalance,
  updatePendingBalance,
  initializeUserBalances,
  getOrCreateBalance,
  DEFAULT_LEAVE_TYPES
};
