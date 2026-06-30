import db from "../config/database.js";
import crypto from "crypto";
import { logActivity } from "./activityLogController.js";
import { getProjectDateStr, getProjectTimeStr } from "../utils/dateUtils.js";
import { isLateCheckIn, isEarlyCheckout } from "../utils/attendanceUtils.js";
import { resolveUserId } from "../utils/dbUtils.js";

const MAX_CHECKIN_PER_DAY = 3;

const getTodayCheckins = async (userId) => {
  const dateStr = getProjectDateStr();
  const todayStart = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
  const todayEnd = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();
  
  const checkins = await db("checkin_checkout")
    .where("user_id", userId)
    .where("created_at", ">=", todayStart)
    .where("created_at", "<=", todayEnd)
    .where("type", "checkin")
    .orderBy("created_at", "desc");
  
  return checkins;
};

const updateAttendanceRecord = async (userId, checkInTime, checkOutTime) => {
  const today = getProjectDateStr();
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
    if (!userId) {
      return res.status(401).json({ success: false, error: "User ID missing from session. Please re-login." });
    }
    
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

    const isEarly = isEarlyCheckout(now);

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
        isEarlyCheckout: isEarly,
      },
    });

    if (isEarly) {
      await logActivity(userId, "early_checkout", "attendance", record.id, { note, durationMinutes: duration }, req.ip);
    }

    await logActivity(userId, "checkout", "attendance", record.id, { note, durationMinutes: duration }, req.ip);
  } catch (error) {
    next(error);
  }
};

const getMyRecords = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    let query = db("checkin_checkout")
      .where("user_id", userId)
      .orderBy("created_at", "asc");

    if (date) {
      const dayStart = new Date(`${date}T00:00:00+05:30`);
      const dayEnd = new Date(`${date}T23:59:59.999+05:30`);
      query = query.where("created_at", ">=", dayStart).where("created_at", "<=", dayEnd);
    }

    const rawRecords = await query;

    const loginLogs = await db("login_logs")
      .where("user_id", userId)
      .orderBy("created_at", "asc");

    const loginByDate = {};
    loginLogs.forEach(log => {
      const dateStr = getProjectDateStr(new Date(log.created_at));
      if (!loginByDate[dateStr]) {
        loginByDate[dateStr] = log.created_at;
      }
    });

    const groupedByDate = {};

    rawRecords.forEach(record => {
      const dateStr = getProjectDateStr(new Date(record.created_at));
      
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = {
          _id: dateStr,
          date: dateStr,
          loginAt: loginByDate[dateStr] || null,
          sessions: [],
          totalDuration: 0
        };
      }

      if (record.type === "checkin") {
        groupedByDate[dateStr].sessions.push({
          _id: record.id,
          checkInAt: record.created_at,
          checkOutAt: null,
          isLate: isLateCheckIn(record.created_at),
          note: record.note
        });
      } else if (record.type === "checkout") {
        const sessions = groupedByDate[dateStr].sessions;
        for (let i = sessions.length - 1; i >= 0; i--) {
          if (!sessions[i].checkOutAt) {
            sessions[i].checkOutAt = record.created_at;
            sessions[i].checkoutNote = record.note;
            sessions[i].isEarly = isEarlyCheckout(record.created_at);
            const duration = Math.round((new Date(record.created_at) - new Date(sessions[i].checkInAt)) / 60000);
            groupedByDate[dateStr].totalDuration += duration;
            break;
          }
        }
      }
    });

    const result = Object.values(groupedByDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(day => ({
        ...day,
        sessions: day.sessions.map(s => ({
          ...s,
          status: s.checkOutAt ? (s.isLate ? "Late" : "On Time") : (s.isEarly ? "Early" : "Active")
        }))
      }))
      .slice(0, 50);

    const todayCheckins = await getTodayCheckins(userId);

    res.json({
      success: true,
      records: result,
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
    let { from, to, userId } = req.query;

    const isAdmin = ["root", "admin", "manager", "teamlead", "hr"].includes(req.user.role);
    
    if (!isAdmin) {
      userId = req.user.id;
    }

    let query = db("checkin_checkout")
      .join("users", "checkin_checkout.user_id", "users.id")
      .select(
        "users.employee_id",
        "users.name",
        "users.department",
        "checkin_checkout.id",
        "checkin_checkout.user_id",
        "checkin_checkout.type",
        "checkin_checkout.parent_id",
        "checkin_checkout.created_at",
        "checkin_checkout.note"
      )
      .orderBy("checkin_checkout.created_at", "asc");

    if (from && to) {
      query = query.whereBetween("checkin_checkout.created_at", [new Date(`${from}T00:00:00+05:30`), new Date(`${to}T23:59:59+05:30`)]);
    }

    if (userId) {
      const resolvedId = await resolveUserId(userId);
      if (resolvedId) {
        query = query.where("checkin_checkout.user_id", resolvedId);
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const rawRecords = await query;

    const userDateMap = {};

    rawRecords.forEach(record => {
      const dateStr = getProjectDateStr(new Date(record.created_at));
      const key = `${record.employee_id}_${dateStr}`;
      
      if (!userDateMap[key]) {
        userDateMap[key] = {
          date: dateStr,
          employeeId: record.employee_id,
          name: record.name,
          department: record.department || "-",
          sessions: [],
          dailyTotalMinutes: 0
        };
      }

      if (record.type === "checkin") {
        userDateMap[key].sessions.push({
          id: record.id,
          checkin: record.created_at,
          checkout: null
        });
      } else if (record.type === "checkout" && record.parent_id) {
        const session = userDateMap[key].sessions.find(s => s.id === record.parent_id);
        if (session) {
          session.checkout = record.created_at;
          session.isEarly = isEarlyCheckout(record.created_at);
          const mins = Math.round((new Date(record.created_at) - new Date(session.checkin)) / 60000);
          userDateMap[key].dailyTotalMinutes += mins;
        }
      }
    });

    const rows = Object.values(userDateMap).map(data => {
      const sortedSessions = [...data.sessions].sort((a, b) => new Date(a.checkin) - new Date(b.checkin));
      const firstIn = sortedSessions[0]?.checkin ? getProjectTimeStr(sortedSessions[0].checkin) : "-";
      
      const checkouts = sortedSessions.map(s => s.checkout).filter(Boolean);
      const lastOut = checkouts.length > 0 ? getProjectTimeStr(checkouts[checkouts.length - 1]) : "Active";

      const totalHrs = Math.floor(data.dailyTotalMinutes / 60);
      const totalMins = data.dailyTotalMinutes % 60;

      const lastCheckoutSession = sortedSessions.filter(s => s.checkout).pop();
      const isEarly = lastCheckoutSession?.isEarly || false;

      const row = {
        date: data.date,
        employeeId: data.employeeId,
        name: data.name,
        department: data.department,
        firstCheckIn: firstIn,
        lastCheckOut: lastOut,
        status: isEarly ? "Early Leave" : (lastOut === "Active" ? "Active" : "Completed"),
        totalWorkTime: `${totalHrs}h ${totalMins}m`,
      };

      for (let i = 0; i < 3; i++) {
        const s = sortedSessions[i];
        const num = i + 1;
        row[`session${num}_In`] = s?.checkin ? getProjectTimeStr(s.checkin) : "-";
        row[`session${num}_Out`] = s?.checkout ? getProjectTimeStr(s.checkout) : "-";
        
        if (s?.checkin && s?.checkout) {
          const mins = Math.round((new Date(s.checkout) - new Date(s.checkin)) / 60000);
          row[`session${num}_Duration`] = `${mins} min`;
        } else {
          row[`session${num}_Duration`] = "-";
        }
      }

      return row;
    });

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

const getAllCheckinRecords = async (req, res, next) => {
  try {
    const { date, userId } = req.query;

    if (!["root", "admin", "manager", "teamlead", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    let query = db("checkin_checkout")
      .join("users", "checkin_checkout.user_id", "users.id")
      .select(
        "checkin_checkout.*",
        "users.name",
        "users.employee_id",
        "users.department"
      )
      .orderBy("checkin_checkout.created_at", "asc");

    if (date) {
      const dayStart = new Date(`${date}T00:00:00+05:30`);
      const dayEnd = new Date(`${date}T23:59:59.999+05:30`);
      query = query.where("checkin_checkout.created_at", ">=", dayStart).where("checkin_checkout.created_at", "<=", dayEnd);
    }

    if (userId) {
      const resolvedId = await resolveUserId(userId);
      if (resolvedId) {
        query = query.where("checkin_checkout.user_id", resolvedId);
      } else {
        return res.json({ success: true, records: [] });
      }
    }

    const rawRecords = await query;
    const grouped = {};

    rawRecords.forEach(record => {
      const dateStr = getProjectDateStr(new Date(record.created_at));
      const key = `${record.user_id}_${dateStr}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          _id: key,
          user: {
            _id: record.user_id,
            name: record.name,
            employeeId: record.employee_id,
            department: record.department,
          },
          date: dateStr,
          sessions: [],
          totalDuration: 0
        };
      }

      if (record.type === "checkin") {
        grouped[key].sessions.push({
          _id: record.id,
          checkInAt: record.created_at,
          checkOutAt: null,
          note: record.note
        });
      } else if (record.type === "checkout") {
        const sessions = grouped[key].sessions;
        for (let i = sessions.length - 1; i >= 0; i--) {
          if (!sessions[i].checkOutAt) {
            sessions[i].checkOutAt = record.created_at;
            sessions[i].checkoutNote = record.note;
            sessions[i].isEarly = isEarlyCheckout(record.created_at);
            const duration = Math.round((new Date(record.created_at) - new Date(sessions[i].checkInAt)) / 60000);
            grouped[key].totalDuration += duration;
            break;
          }
        }
      }
    });

    res.json({
      success: true,
      records: Object.values(grouped).reverse(),
    });
  } catch (error) {
    next(error);
  }
};

export { checkin, checkout, getMyRecords, getAllCheckinRecords, exportCheckinExcel };
