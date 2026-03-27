import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/database.js";
import { uploadFile, deleteFile } from "../utils/supabaseStorage.js";
import dotenv from "dotenv";

dotenv.config();

const createOrUpdateAttendanceOnLogin = async (userId, action = "checkin") => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    try {
      if (action === "checkin") {
        await db("attendance")
          .where("user_id", userId)
          .where("date", today)
          .update({ status: "Present", check_in_at: now, updated_at: now });
        
        const inserted = await db("attendance")
          .where("user_id", userId)
          .where("date", today)
          .first();
        
        if (!inserted) {
          await db("attendance").insert({
            user_id: userId,
            date: today,
            status: "Present",
            check_in_at: now,
            created_at: now,
            updated_at: now,
          });
        }
      } else if (action === "checkout") {
        await db("attendance")
          .where("user_id", userId)
          .where("date", today)
          .update({ check_out_at: now, updated_at: now });
      }
    } catch (e) {
      if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
        if (action === "checkin") {
          await db("attendance")
            .where("user_id", userId)
            .where("date", today)
            .update({ status: "Present", check_in_at: now, updated_at: now });
        }
      }
    }
  } catch (err) {
    console.error("Attendance update error:", err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get("user-agent") || "Unknown";

    const user = await db("users").where("email", email.toLowerCase()).first();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await db("login_logs").insert({
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        status: "failed",
      });
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { _id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    const refreshToken = jwt.sign(
      { _id: user.id, type: "refresh" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    await db("login_logs").insert({
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      status: "success",
    });

    await createOrUpdateAttendanceOnLogin(user.id, "checkin");

    res.json({
      success: true,
      token,
      refreshToken,
      expiresIn: "7d",
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        profileImage: user.profile_image,
        employeeId: user.employee_id,
        department: user.department,
        designation: user.designation,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await createOrUpdateAttendanceOnLogin(req.user._id, "checkout");

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token required",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
    }

    const user = await db("users").where("id", decoded._id).first();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    const newToken = jwt.sign(
      { _id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    const newRefreshToken = jwt.sign(
      { _id: user.id, type: "refresh" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: "7d",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Refresh token expired, please login again",
      });
    }
    next(error);
  }
};

const getLoginLogs = async (req, res, next) => {
  try {
    const { from, to, userId, status } = req.query;

    let query = db("login_logs")
      .join("users", "login_logs.user_id", "users.id")
      .select(
        "login_logs.id",
        "login_logs.ip_address",
        "login_logs.user_agent",
        "login_logs.status",
        "login_logs.created_at",
        "users.name as user_name",
        "users.email",
        "users.employee_id"
      )
      .orderBy("login_logs.created_at", "desc")
      .limit(500);

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
      logs: logs.map((l) => ({
        _id: l.id,
        user: {
          _id: l.user_id,
          name: l.user_name,
          email: l.email,
          employeeId: l.employee_id,
        },
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        status: l.status,
        createdAt: l.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

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
        dob: e.dob ? new Date(e.dob).toLocaleDateString() : "-",
        maritalStatus: e.marital_status || "-",
        salary: e.salary ? `$${e.salary}` : "-",
        attendanceStatus: e.attendance_status,
        createdAt: new Date(e.created_at).toLocaleDateString(),
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
        date: new Date(r.date).toLocaleDateString(),
        status: r.status,
        checkIn: r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString() : "-",
        checkOut: r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString() : "-",
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
        date: new Date(l.created_at).toLocaleDateString(),
        time: new Date(l.created_at).toLocaleTimeString(),
      })),
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Old password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters",
      });
    }

    const user = await db("users").where("id", userId).first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await db("users")
      .where("id", userId)
      .update({
        password: hashedNewPassword,
        updated_at: db.fn.now(),
      });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const user = await db("users").where("email", email.toLowerCase()).first();

    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: "If an account exists with this email, a password reset request has been sent.",
      });
    }

    // In production, send email here
    console.log(`Password reset requested for: ${email}`);

    res.json({
      success: true,
      message: "If an account exists with this email, a password reset request has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const userId = req.user._id;

    const oldUser = await db("users").where("id", userId).first();
    if (oldUser?.avatar) {
      await deleteFile(oldUser.avatar);
    }

    const avatarUrl = await uploadFile(req.file, "avatars");

    await db("users")
      .where("id", userId)
      .update({
        avatar: avatarUrl,
        updated_at: db.fn.now(),
      });

    res.json({
      success: true,
      avatarUrl,
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await db("users")
      .where("id", req.user._id)
      .select(
        "id",
        "name",
        "email",
        "role",
        "employee_id",
        "dob",
        "gender",
        "marital_status",
        "designation",
        "department",
        "salary",
        "profile_image",
        "avatar",
        "attendance_status",
        "created_at"
      )
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        dob: user.dob,
        gender: user.gender,
        maritalStatus: user.marital_status,
        designation: user.designation,
        department: user.department,
        salary: user.salary,
        profileImage: user.profile_image,
        avatar: user.avatar,
        attendanceStatus: user.attendance_status,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { login, logout, refreshAccessToken, changePassword, forgotPassword, uploadAvatar, getProfile, getLoginLogs, exportEmployeesExcel, exportAttendanceExcel, exportLoginLogsExcel };
