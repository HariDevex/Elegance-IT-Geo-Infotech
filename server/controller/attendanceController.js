import db from "../config/database.js";
import crypto from "crypto";

const canViewAll = (role) => ["root", "admin", "manager"].includes(role);
const canWrite = (role) => ["root", "admin", "manager"].includes(role);

const LATE_THRESHOLD_HOUR = 9;
const LATE_THRESHOLD_MINUTE = 15;

const isLateCheckIn = (checkInTime) => {
  if (!checkInTime) return false;
  const checkIn = new Date(checkInTime);
  const hour = checkIn.getHours();
  const minute = checkIn.getMinutes();
  if (hour > LATE_THRESHOLD_HOUR) return true;
  if (hour === LATE_THRESHOLD_HOUR && minute > LATE_THRESHOLD_MINUTE) return true;
  return false;
};

const getAttendanceStatus = (checkInTime) => {
  if (!checkInTime) return "Absent";
  return isLateCheckIn(checkInTime) ? "Late" : "On Time";
};

const createOrUpdateAttendance = async (req, res, next) => {
  try {
    const { userId, date, status, action } = req.body;
    const targetUserId = userId || req.user._id;

    if (!targetUserId || !date) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const self = targetUserId === req.user._id;
    if (!self && !canWrite(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const user = await db("users").where("employee_id", targetUserId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const dateStr = date.split("T")[0];
    const now = new Date();

    let record;
    let updated = false;

    if (action === "checkin") {
      const existing = await db("attendance")
        .where("user_id", targetUserId)
        .where("date", dateStr)
        .first();
      
      if (existing) {
        await db("attendance")
          .where("id", existing.id)
          .update({ status: "Present", check_in_at: now, updated_at: now });
        updated = true;
      }
      
      if (!updated) {
        const newId = crypto.randomUUID();
        await db("attendance").insert({
          id: newId,
          user_id: targetUserId,
          date: dateStr,
          status: "Present",
          check_in_at: now,
          created_at: now,
          updated_at: now,
        });
      }
    } else if (action === "checkout") {
      await db("attendance")
        .where("user_id", targetUserId)
        .where("date", dateStr)
        .update({ check_out_at: now, updated_at: now });
    } else if (!action && !status) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    } else if (status) {
      const existing = await db("attendance")
        .where("user_id", targetUserId)
        .where("date", dateStr)
        .first();
      
      if (existing) {
        await db("attendance")
          .where("id", existing.id)
          .update({ status, updated_at: now });
      } else {
        const newId = crypto.randomUUID();
        await db("attendance").insert({
          id: newId,
          user_id: targetUserId,
          date: dateStr,
          status,
          created_at: now,
          updated_at: now,
        });
      }
    }

    record = await db("attendance")
      .where("user_id", targetUserId)
      .where("date", dateStr)
      .first();

    const isLate = isLateCheckIn(record.check_in_at);
    const attendanceStatus = record.status === "Present" ? (isLate ? "Late" : "On Time") : record.status;

    res.json({
      success: true,
      record: {
        _id: record.id,
        userId: record.user_id,
        date: record.date,
        status: attendanceStatus,
        checkInAt: record.check_in_at,
        checkOutAt: record.check_out_at,
        isLate: isLate,
      },
    });
  } catch (error) {
    next(error);
  }
};

const listAttendance = async (req, res, next) => {
  try {
    const { date, from, to, userId } = req.query;
    
    if (!canViewAll(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized to view all attendance" });
    }
    
    const attendanceQuery = db("attendance")
      .join("users", "attendance.user_id", "users.employee_id")
      .select(
        "attendance.id",
        "attendance.user_id",
        "attendance.date",
        "attendance.status",
        "attendance.check_in_at",
        "attendance.check_out_at",
        "users.name as user_name",
        "users.employee_id",
        "users.department",
        "users.role"
      )
      .orderBy("attendance.date", "desc")
      .limit(500);

    if (date) {
      const dateStr = date.split("T")[0];
      attendanceQuery.where("attendance.date", dateStr);
    }

    if (from && to) {
      attendanceQuery.whereBetween("attendance.date", [from, to]);
    }

    if (userId) {
      attendanceQuery.where("attendance.user_id", userId);
    }

    const records = await attendanceQuery;

    const result = records.map((r) => {
      const isLate = isLateCheckIn(r.check_in_at);
      const attendanceStatus = r.status === "Present" ? (isLate ? "Late" : "On Time") : r.status;
      return {
        _id: r.id,
        user: { _id: r.user_id, name: r.user_name, employeeId: r.employee_id, department: r.department, role: r.role },
        date: r.date,
        status: attendanceStatus,
        checkInAt: r.check_in_at,
        checkOutAt: r.check_out_at,
        isLate: isLate,
      };
    });

    res.json({ success: true, records: result });
  } catch (error) {
    next(error);
  }
};

const listMyAttendance = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const userId = req.user._id;

    const checkinQuery = db("checkin_checkout")
      .where("user_id", userId)
      .whereBetween("created_at", [from ? new Date(from) : new Date("1970-01-01"), to ? new Date(to + "T23:59:59") : new Date("2099-12-31")])
      .orderBy("created_at", "asc");

    const checkinRecords = await checkinQuery;

    const loginQuery = db("login_logs")
      .where("user_id", userId)
      .whereBetween("created_at", [from ? new Date(from) : new Date("1970-01-01"), to ? new Date(to + "T23:59:59") : new Date("2099-12-31")])
      .orderBy("created_at", "asc");

    const loginLogs = await loginQuery;

    const loginByDate = {};
    loginLogs.forEach(log => {
      const date = new Date(log.created_at).toISOString().split("T")[0];
      if (!loginByDate[date]) {
        loginByDate[date] = log.created_at;
      }
    });

    const groupedByDate = {};

    checkinRecords.forEach(record => {
      const dateStr = new Date(record.created_at).toISOString().split("T")[0];
      
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = {
          date: dateStr,
          loginAt: loginByDate[dateStr] || null,
          sessions: []
        };
      }

      if (record.type === "checkin") {
        groupedByDate[dateStr].sessions.push({
          _id: record.id,
          checkInAt: record.created_at,
          checkOutAt: null,
          isLate: isLateCheckIn(record.created_at),
        });
      } else if (record.type === "checkout") {
        const sessions = groupedByDate[dateStr].sessions;
        const lastSessionWithoutCheckout = sessions.reverse().find(s => !s.checkOutAt);
        if (lastSessionWithoutCheckout) {
          lastSessionWithoutCheckout.checkOutAt = record.created_at;
        }
      }
    });

    const records = Object.values(groupedByDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(day => ({
        _id: day.date,
        date: day.date,
        loginAt: day.loginAt,
        sessions: day.sessions.filter(s => s.checkInAt).map(s => ({
          ...s,
          status: s.checkOutAt ? (s.isLate ? "Late" : "On Time") : "Active"
        }))
      }));

    res.json({
      success: true,
      records: records,
    });
  } catch (error) {
    next(error);
  }
};

export { createOrUpdateAttendance, listAttendance, listMyAttendance };