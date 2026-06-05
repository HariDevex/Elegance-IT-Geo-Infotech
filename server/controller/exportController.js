import db from "../config/database.js";
import { getProjectDateStr, getProjectTimeStr } from "../utils/dateUtils.js";

const exportEmployeesExcel = async (req, res, next) => {
  try {
    const employees = await db("users")
      .select(
        "employee_id",
        "name",
        "email",
        "role",
        "department",
        "designation",
        "gender",
        "dob",
        "marital_status",
        "salary",
        "attendance_status",
        "created_at"
      )
      .orderBy("created_at", "desc");

    res.json({
      success: true,
      data: employees.map((e) => ({
        employeeId: e.employee_id || "-",
        name: e.name,
        email: e.email,
        role: e.role,
        department: e.department || "-",
        designation: e.designation || "-",
        gender: e.gender || "-",
        dob: e.dob ? getProjectDateStr(new Date(e.dob)) : "-",
        maritalStatus: e.marital_status || "-",
        salary: e.salary ? `$${e.salary}` : "-",
        attendanceStatus: e.attendance_status,
        createdAt: getProjectDateStr(new Date(e.created_at)),
      })),
    });
  } catch (error) {
    next(error);
  }
};

const exportAttendanceExcel = async (req, res, next) => {
  try {
    const { from, to, userId } = req.query;

    let query = db("attendance")
      .join("users", "attendance.user_id", "users.id")
      .select(
        "users.employee_id",
        "users.name",
        "users.department",
        "attendance.date",
        "attendance.status",
        "attendance.check_in_at",
        "attendance.check_out_at"
      )
      .orderBy("attendance.date", "desc");

    if (from && to) {
      query = query.whereBetween("attendance.date", [new Date(from), new Date(to)]);
    }

    if (userId) {
      query = query.where("attendance.user_id", userId);
    }

    const records = await query;

    res.json({
      success: true,
      data: records.map((r) => ({
        employeeId: r.employee_id || "-",
        name: r.name,
        department: r.department || "-",
        date: r.date ? getProjectDateStr(new Date(r.date)) : "-",
        status: r.status,
        checkIn: r.check_in_at ? getProjectTimeStr(r.check_in_at) : "-",
        checkOut: r.check_out_at ? getProjectTimeStr(r.check_out_at) : "-",
      })),
    });
  } catch (error) {
    next(error);
  }
};

const exportLoginLogsExcel = async (req, res, next) => {
  try {
    const { from, to, userId, status } = req.query;

    let query = db("login_logs")
      .join("users", "login_logs.user_id", "users.id")
      .select(
        "users.employee_id",
        "users.name",
        "users.email",
        "login_logs.ip_address",
        "login_logs.status",
        "login_logs.created_at"
      )
      .orderBy("login_logs.created_at", "desc")
      .limit(1000);

    if (from && to) {
      query = query.whereBetween("login_logs.created_at", [new Date(from), new Date(to)]);
    }

    if (userId) {
      query = query.where("login_logs.user_id", userId);
    }

    if (status) {
      query = query.where("login_logs.status", status);
    }

    const logs = await query;

    res.json({
      success: true,
      data: logs.map((l) => ({
        employeeId: l.employee_id || "-",
        name: l.name,
        email: l.email,
        ipAddress: l.ip_address || "-",
        status: l.status,
        date: getProjectDateStr(new Date(l.created_at)),
        time: getProjectTimeStr(new Date(l.created_at)),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export { exportEmployeesExcel, exportAttendanceExcel, exportLoginLogsExcel };
