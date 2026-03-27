import db from "../config/database.js";

const canWrite = (role) => ["root", "admin", "manager"].includes(role);

const createOrUpdateAttendance = async (req, res, next) => {
  try {
    const { userId, date, status, action } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const self = userId === req.user._id;
    if (!self && !canWrite(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const user = await db("users").where("id", userId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const dateStr = date.split("T")[0];
    const now = new Date();

    let record;

    try {
      if (action === "checkin") {
        [record] = await db("attendance")
          .where("user_id", userId)
          .where("date", dateStr)
          .update({ status: "Present", check_in_at: now, updated_at: now })
          .returning("*");

        if (!record) {
          [record] = await db("attendance")
            .insert({
              user_id: userId,
              date: dateStr,
              status: "Present",
              check_in_at: now,
              created_at: now,
              updated_at: now,
            })
            .returning("*");
        }
      } else if (action === "checkout") {
        [record] = await db("attendance")
          .where("user_id", userId)
          .where("date", dateStr)
          .update({ check_out_at: now, updated_at: now })
          .returning("*");
      } else if (status) {
        [record] = await db("attendance")
          .where("user_id", userId)
          .where("date", dateStr)
          .update({ status, updated_at: now })
          .returning("*");

        if (!record) {
          [record] = await db("attendance")
            .insert({
              user_id: userId,
              date: dateStr,
              status,
              created_at: now,
              updated_at: now,
            })
            .returning("*");
        }
      }
    } catch (insertError) {
      if (insertError.code === "SQLITE_CONSTRAINT_UNIQUE") {
        if (action === "checkin") {
          [record] = await db("attendance")
            .where("user_id", userId)
            .where("date", dateStr)
            .update({ status: "Present", check_in_at: now, updated_at: now })
            .returning("*");
        } else if (action === "checkout") {
          [record] = await db("attendance")
            .where("user_id", userId)
            .where("date", dateStr)
            .update({ check_out_at: now, updated_at: now })
            .returning("*");
        } else if (status) {
          [record] = await db("attendance")
            .where("user_id", userId)
            .where("date", dateStr)
            .update({ status, updated_at: now })
            .returning("*");
        }
      } else {
        throw insertError;
      }
    }

    if (!record) {
      record = await db("attendance")
        .where("user_id", userId)
        .where("date", dateStr)
        .first();
    }

    res.json({
      success: true,
      record: {
        _id: record.id,
        userId: record.user_id,
        date: record.date,
        status: record.status,
        checkInAt: record.check_in_at,
        checkOutAt: record.check_out_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const listAttendance = async (req, res, next) => {
  try {
    const { date, from, to, userId, includeLoginLogs } = req.query;
    
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

    let result = records.map((r) => ({
      _id: r.id,
      user: { _id: r.user_id, name: r.user_name, employeeId: r.employee_id, department: r.department, role: r.role },
      date: r.date,
      status: r.status,
      checkInAt: r.check_in_at,
      checkOutAt: r.check_out_at,
      type: "attendance",
    }));

    if (includeLoginLogs === "true") {
      const loginQuery = db("login_logs")
        .join("users", "login_logs.user_id", "users.id")
        .select("login_logs.id", "login_logs.user_id", "login_logs.created_at as login_time", "login_logs.status as login_status", "users.name as user_name", "users.employee_id", "users.department", "users.role")
        .orderBy("login_logs.created_at", "desc")
        .limit(500);

      if (from && to) loginQuery.whereBetween("login_logs.created_at", [from, to]);
      if (userId) loginQuery.where("login_logs.user_id", userId);

      const loginRecords = await loginQuery;
      const loginActivity = loginRecords.map((r) => ({
        _id: r.id,
        user: { _id: r.user_id, name: r.user_name, employeeId: r.employee_id, department: r.department, role: r.role },
        date: r.login_time,
        status: r.login_status === "success" ? "Logged In" : "Login Failed",
        checkInAt: r.login_status === "success" ? r.login_time : null,
        checkOutAt: null,
        type: "login",
      }));
      result = [...result, ...loginActivity].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    res.json({ success: true, records: result });
  } catch (error) {
    next(error);
  }
};

export { createOrUpdateAttendance, listAttendance };