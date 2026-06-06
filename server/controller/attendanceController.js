import db from "../config/database.js";
import crypto from "crypto";
import { canViewAll, canWrite, isLateCheckIn } from "../utils/attendanceUtils.js";
import { resolveUserId } from "../utils/dbUtils.js";
import { getProjectDateStr, getProjectTimeStr } from "../utils/dateUtils.js";
import { logActivity } from "./activityLogController.js";

const createOrUpdateAttendance = async (req, res, next) => {
  try {
    const { userId, date, status, action } = req.body;
    const inputId = userId || req.user.id;

    if (!inputId || !date) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const resolvedId = await resolveUserId(inputId);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const isSelf = resolvedId === req.user.id;
    if (!isSelf && !canWrite(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const dateStr = date.split("T")[0];
    const now = new Date();

    if (action === "checkin") {
      const existing = await db("attendance")
        .where("user_id", resolvedId)
        .where("date", dateStr)
        .first();
      
      if (existing) {
        await db("attendance")
          .where("id", existing.id)
          .update({ status: "Present", check_in_at: now, updated_at: now });
      } else {
        await db("attendance").insert({
          id: crypto.randomUUID(),
          user_id: resolvedId,
          date: dateStr,
          status: "Present",
          check_in_at: now,
          created_at: now,
          updated_at: now,
        });
      }
    } else if (action === "checkout") {
      await db("attendance")
        .where("user_id", resolvedId)
        .where("date", dateStr)
        .update({ check_out_at: now, updated_at: now });
    } else if (status) {
      const existing = await db("attendance")
        .where("user_id", resolvedId)
        .where("date", dateStr)
        .first();
      
      if (existing) {
        await db("attendance")
          .where("id", existing.id)
          .update({ status, updated_at: now });
      } else {
        await db("attendance").insert({
          id: crypto.randomUUID(),
          user_id: resolvedId,
          date: dateStr,
          status,
          created_at: now,
          updated_at: now,
        });
      }
    }

    const record = await db("attendance")
      .where("user_id", resolvedId)
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

    await logActivity(req.user.id, "update_attendance", "attendance", record.id, { targetUser: resolvedId, status: attendanceStatus }, req.ip);
  } catch (error) {
    next(error);
  }
};

const listAttendance = async (req, res, next) => {
  try {
    const { date, from, to, userId, page = 1, limit = 50 } = req.query;
    
    if (!canViewAll(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized to view all attendance" });
    }
    
    const currentPage = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (currentPage - 1) * pageSize;
    
    const attendanceQuery = db("attendance")
      .join("users", "attendance.user_id", "users.id")
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
      .orderBy("attendance.date", "desc");

    if (date) {
      attendanceQuery.where("attendance.date", date.split("T")[0]);
    }

    if (from && to) {
      attendanceQuery.whereBetween("attendance.date", [from, to]);
    }

    if (userId) {
      const resolvedId = await resolveUserId(userId);
      if (resolvedId) {
        attendanceQuery.where("attendance.user_id", resolvedId);
      } else {
        return res.json({ success: true, records: [], pagination: { page: currentPage, limit: pageSize, total: 0, pages: 0 } });
      }
    }

    const [{ count }] = await attendanceQuery.clone().clearSelect().clearOrder().count("* as count");
    const records = await attendanceQuery.clone().limit(pageSize).offset(offset);

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

    res.json({
      success: true,
      records: result,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: parseInt(count),
        pages: Math.ceil(parseInt(count) / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

const listMyAttendance = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const userId = req.user.id;

    let fromDate = from || getProjectDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    let toDate = to || getProjectDateStr();

    // Fetch checkin_checkout sessions
    const checkinRecords = await db("checkin_checkout")
      .where("user_id", userId)
      .whereBetween("created_at", [new Date(fromDate + "T00:00:00+05:30"), new Date(toDate + "T23:59:59+05:30")])
      .orderBy("created_at", "asc");

    // Fetch login logs
    const loginLogs = await db("login_logs")
      .where("user_id", userId)
      .whereBetween("created_at", [new Date(fromDate + "T00:00:00+05:30"), new Date(toDate + "T23:59:59+05:30")])
      .orderBy("created_at", "asc");

    const loginByDate = {};
    loginLogs.forEach(log => {
      const dateStr = getProjectDateStr(new Date(log.created_at));
      if (!loginByDate[dateStr]) {
        loginByDate[dateStr] = log.created_at;
      }
    });

    const groupedByDate = {};

    checkinRecords.forEach(record => {
      const dateStr = getProjectDateStr(new Date(record.created_at));
      
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
        for (let i = sessions.length - 1; i >= 0; i--) {
          if (!sessions[i].checkOutAt) {
            sessions[i].checkOutAt = record.created_at;
            break;
          }
        }
      }
    });

    // Ensure all days in range are represented if they have a login or a checkin
    const records = Object.values(groupedByDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(day => ({
        _id: day.date,
        date: day.date,
        loginAt: day.loginAt,
        sessions: day.sessions.map(s => ({
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

const generateQrToken = async (req, res, next) => {
  try {
    if (!["root", "admin", "manager", "teamlead", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: "userId is required" });

    const resolvedId = await resolveUserId(userId);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db("qr_checkin_tokens").insert({ token, user_id: resolvedId, expires_at: expiresAt });

    res.json({ success: true, token, expires_at: expiresAt.toISOString() });
  } catch (error) {
    next(error);
  }
};

const qrCheckin = async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ success: false, error: "qrToken is required" });

    const qrRecord = await db("qr_checkin_tokens").where({ token: qrToken, used: false }).first();
    if (!qrRecord) return res.status(400).json({ success: false, error: "Invalid QR token" });
    if (new Date(qrRecord.expires_at) < new Date()) return res.status(400).json({ success: false, error: "QR token expired" });

    await db("qr_checkin_tokens").where("id", qrRecord.id).update({ used: true, used_by: req.user.id, used_at: db.fn.now() });

    const id = crypto.randomUUID();
    await db("checkin_checkout").insert({
      id, user_id: req.user.id, type: "checkin", note: "QR check-in", ip_address: req.ip,
    });

    res.json({ success: true, message: "QR check-in successful" });
  } catch (error) {
    next(error);
  }
};

const geoCheckin = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: "latitude and longitude are required" });
    }

    const OFFICE_LAT = parseFloat(process.env.OFFICE_LAT) || 28.6139;
    const OFFICE_LNG = parseFloat(process.env.OFFICE_LNG) || 77.209;
    const MAX_RADIUS = parseFloat(process.env.GEO_MAX_RADIUS) || 100;

    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(OFFICE_LAT - parseFloat(latitude));
    const dLon = toRad(OFFICE_LNG - parseFloat(longitude));
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latitude)) * Math.cos(toRad(OFFICE_LAT)) * Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (distance > MAX_RADIUS) {
      return res.status(400).json({
        success: false, error: `You are ${Math.round(distance)}m away from office. Must be within ${MAX_RADIUS}m.`,
        distance: Math.round(distance),
      });
    }

    const id = crypto.randomUUID();
    await db("checkin_checkout").insert({
      id, user_id: req.user.id, type: "checkin",
      location: JSON.stringify({ latitude: parseFloat(latitude), longitude: parseFloat(longitude), distance: Math.round(distance) }),
      ip_address: req.ip, note: "Geo check-in",
    });

    res.json({ success: true, message: "Geo check-in successful", distance: Math.round(distance) });
  } catch (error) {
    next(error);
  }
};

export { createOrUpdateAttendance, listAttendance, listMyAttendance, generateQrToken, qrCheckin, geoCheckin };
