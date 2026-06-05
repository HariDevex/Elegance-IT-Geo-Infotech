import db from "../config/database.js";
import crypto from "crypto";
import { canViewAll, canWrite, isLateCheckIn } from "../utils/attendanceUtils.js";

const createOrUpdateAttendance = async (req, res, next) => {
  try {
    const { userId, date, status, action } = req.body;
    const input = userId || req.user._id;

    if (!input || !date) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
    const self = isUuid ? input === req.user.id : input === req.user._id;
    if (!self && !canWrite(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const user = isUuid
      ? await db("users").where("id", input).first()
      : await db("users").where("employee_id", input).first();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const dateStr = date.split("T")[0];
    const now = new Date();

    let record;
    let updated = false;

    if (action === "checkin") {
      const existing = await db("attendance")
        .where("user_id", user.id)
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
          user_id: user.id,
          date: dateStr,
          status: "Present",
          check_in_at: now,
          created_at: now,
          updated_at: now,
        });
      }
    } else if (action === "checkout") {
      await db("attendance")
        .where("user_id", user.id)
        .where("date", dateStr)
        .update({ check_out_at: now, updated_at: now });
    } else if (!action && !status) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    } else if (status) {
      const existing = await db("attendance")
        .where("user_id", user.id)
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
          user_id: user.id,
          date: dateStr,
          status,
          created_at: now,
          updated_at: now,
        });
      }
    }

    record = await db("attendance")
      .where("user_id", user.id)
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
    const { date, from, to, userId, page, limit } = req.query;
    
    if (!canViewAll(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized to view all attendance" });
    }
    
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
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
      const dateStr = date.split("T")[0];
      attendanceQuery.where("attendance.date", dateStr);
    }

    if (from && to) {
      attendanceQuery.whereBetween("attendance.date", [from, to]);
    }

    if (userId) {
      attendanceQuery.where("attendance.user_id", userId);
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

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const generateQrToken = async (req, res, next) => {
  try {
    if (!["root", "admin", "manager", "teamlead", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: "userId is required" });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db("qr_checkin_tokens").insert({ token, user_id: userId, expires_at: expiresAt });

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

    const distance = haversineDistance(parseFloat(latitude), parseFloat(longitude), OFFICE_LAT, OFFICE_LNG);
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