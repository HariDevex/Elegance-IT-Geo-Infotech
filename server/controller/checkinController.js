import db from "../config/database.js";
import crypto from "crypto";
import { logActivity } from "./activityLogController.js";
import { isLateCheckIn } from "../utils/attendanceUtils.js";

const MAX_CHECKIN_PER_DAY = 3;

const getTodayCheckins = async (userId) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  
  const checkins = await db("checkin_checkout")
    .where("user_id", userId)
    .where("created_at", ">=", todayStart)
    .where("created_at", "<=", todayEnd)
    .where("type", "checkin")
    .orderBy("created_at", "desc");
  
  return checkins;
};

const updateAttendanceRecord = async (userId, checkInTime, checkOutTime) => {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  
  const existing = await db("attendance")
    .where("user_id", userId)
    .where("date", today)
    .first();
  
  if (existing) {
    const updates = { updated_at: now };
    if (checkInTime && !existing.check_in_at) {
      updates.check_in_at = checkInTime;
      const isLate = isLateCheckIn(checkInTime);
      updates.status = isLate ? "Late" : "On Time";
    }
    if (checkOutTime) {
      updates.check_out_at = checkOutTime;
    }
    await db("attendance")
      .where("id", existing.id)
      .update(updates);
  } else {
    const isLate = checkInTime ? isLateCheckIn(checkInTime) : false;
    await db("attendance").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      date: today,
      status: checkInTime ? (isLate ? "Late" : "On Time") : "Present",
      check_in_at: checkInTime || now,
      check_out_at: checkOutTime || null,
      created_at: now,
      updated_at: now,
    });
  }
};

const checkin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { note } = req.body;
    const now = new Date();

    const todayCheckins = await getTodayCheckins(userId);

    if (todayCheckins.length >= MAX_CHECKIN_PER_DAY) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_CHECKIN_PER_DAY} check-ins allowed per day`,
        count: todayCheckins.length,
        max: MAX_CHECKIN_PER_DAY,
      });
    }

    const recordId = crypto.randomUUID();
    await db("checkin_checkout")
      .insert({
        id: recordId,
        user_id: userId,
        type: "checkin",
        note: note || null,
        created_at: now,
      });

    await updateAttendanceRecord(userId, now, null);

    const allCheckins = await getTodayCheckins(userId);
    const record = await db("checkin_checkout").where("id", recordId).first();

    res.status(201).json({
      success: true,
      record: {
        _id: record.id,
        type: record.type,
        time: record.created_at,
        note: record.note,
      },
      todayCount: allCheckins.length,
      maxAllowed: MAX_CHECKIN_PER_DAY,
    });

    await logActivity(userId, "checkin", "attendance", record.id, { note }, req.ip);
  } catch (error) {
    next(error);
  }
};

const checkout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { note } = req.body;
    const now = new Date();

    const lastCheckin = await db("checkin_checkout")
      .where("user_id", userId)
      .where("type", "checkin")
      .orderBy("created_at", "desc")
      .first();

    if (!lastCheckin) {
      return res.status(400).json({
        success: false,
        error: "No check-in found. Please check in first.",
      });
    }

    const lastCheckout = await db("checkin_checkout")
      .where("user_id", userId)
      .where("type", "checkout")
      .where("parent_id", lastCheckin.id)
      .first();

    if (lastCheckout) {
      return res.status(400).json({
        success: false,
        error: "Already checked out from this session.",
      });
    }

    const recordId = crypto.randomUUID();
    await db("checkin_checkout")
      .insert({
        id: recordId,
        user_id: userId,
        type: "checkout",
        parent_id: lastCheckin.id,
        note: note || null,
        created_at: now,
      });

    await updateAttendanceRecord(userId, null, now);

    const record = await db("checkin_checkout").where("id", recordId).first();
    const checkinTime = new Date(lastCheckin.created_at);
    const checkoutTime = new Date(record.created_at);
    const duration = Math.round((checkoutTime - checkinTime) / 60000);

    res.status(201).json({
      success: true,
      record: {
        _id: record.id,
        type: record.type,
        time: record.created_at,
        note: record.note,
      },
      session: {
        checkinTime: lastCheckin.created_at,
        checkoutTime: record.created_at,
        durationMinutes: duration,
      },
    });

    await logActivity(userId, "checkout", "attendance", record.id, { note, durationMinutes: duration }, req.ip);
  } catch (error) {
    next(error);
  }
};

const getMyRecords = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date, limit = 100 } = req.query;

    let query = db("checkin_checkout")
      .where("user_id", userId)
      .orderBy("created_at", "desc")
      .limit(parseInt(limit));

    if (date) {
      const dayStart = new Date(date).getTime();
      const dayEnd = new Date(date + "T23:59:59.999Z").getTime();
      query = query.where("created_at", ">=", dayStart).where("created_at", "<=", dayEnd);
    }

    const records = await query;

    const grouped = [];
    let currentSession = null;

    for (const record of records) {
      if (record.type === "checkin") {
        currentSession = {
          date: record.created_at,
          checkin: {
            _id: record.id,
            time: record.created_at,
            note: record.note,
          },
          checkout: null,
          duration: null,
        };
        grouped.push(currentSession);
      } else if (record.type === "checkout" && currentSession && !currentSession.checkout) {
        currentSession.checkout = {
          _id: record.id,
          time: record.created_at,
          note: record.note,
        };
        const start = new Date(currentSession.checkin.time);
        const end = new Date(currentSession.checkout.time);
        currentSession.duration = Math.round((end - start) / 60000);
        currentSession = null;
      }
    }

    const todayCheckins = await getTodayCheckins(userId);

    res.json({
      success: true,
      records: grouped,
      todayStats: {
        checkinCount: todayCheckins.length,
        maxAllowed: MAX_CHECKIN_PER_DAY,
        remaining: Math.max(0, MAX_CHECKIN_PER_DAY - todayCheckins.length),
      },
    });
  } catch (error) {
    next(error);
  }
};

const exportCheckinExcel = async (req, res, next) => {
  try {
    const { from, to, userId } = req.query;

    let query = db("checkin_checkout")
      .join("users", "checkin_checkout.user_id", "users.id")
      .select(
        "users.employee_id",
        "users.name",
        "users.department",
        "checkin_checkout.type",
        "checkin_checkout.note",
        "checkin_checkout.created_at"
      )
      .orderBy("checkin_checkout.created_at", "desc");

    if (from && to) {
      query = query.whereBetween("checkin_checkout.created_at", [new Date(from), new Date(to)]);
    }

    if (userId) {
      query = query.where("checkin_checkout.user_id", userId);
    }

    const records = await query;

    const grouped = {};
    for (const record of records) {
      const dateKey = new Date(record.created_at).toISOString().split("T")[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(record);
    }

    const sessions = [];
    for (const [date, dayRecords] of Object.entries(grouped)) {
      let currentCheckin = null;
      for (const record of dayRecords) {
        if (record.type === "checkin") {
          currentCheckin = {
            date,
            employeeId: record.employee_id,
            name: record.name,
            department: record.department || "-",
            checkinTime: new Date(record.created_at).toLocaleTimeString(),
            checkoutTime: "-",
            duration: "-",
            note: record.note || "-",
          };
        } else if (record.type === "checkout" && currentCheckin && currentCheckin.checkoutTime === "-") {
          currentCheckin.checkoutTime = new Date(record.created_at).toLocaleTimeString();
          const start = new Date(currentCheckin.checkinTime);
          const end = new Date(record.created_at);
          currentCheckin.duration = `${Math.round((end - start) / 60000)} min`;
        }
        if (currentCheckin && currentCheckin.checkoutTime !== "-") {
          sessions.push(currentCheckin);
          currentCheckin = null;
        }
      }
      if (currentCheckin && currentCheckin.checkoutTime === "-") {
        sessions.push(currentCheckin);
      }
    }

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

export { checkin, checkout, getMyRecords, exportCheckinExcel };
