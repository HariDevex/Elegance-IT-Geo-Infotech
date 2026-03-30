import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../config/database.js";
import { uploadFile, deleteFile } from "../utils/supabaseStorage.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";
import { config } from "../config/appConfig.js";
import { logActivity } from "./activityLogController.js";
import aiSecurity from "../utils/aiSecurity.js";
import { blacklistToken } from "../utils/tokenBlacklist.js";

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
    const { employee_id, password, rememberMe } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get("user-agent") || "Unknown";
    const now = new Date();

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        error: "Employee ID is required",
      });
    }

    const input = employee_id.toUpperCase();
    const user = await db("users").where("employee_id", input).first();

    if (!user) {
      await db("login_attempts").insert({
        email: input,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        failure_reason: "user_not_found",
      });
      return res.status(401).json({
        success: false,
        error: "Invalid Employee ID",
      });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > now) {
      await db("login_attempts").insert({
        email: input,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        failure_reason: "account_locked",
      });
      return res.status(423).json({
        success: false,
        error: "Account is temporarily locked",
        lockedUntil: user.locked_until,
      });
    }

    // Check if account is active
    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated. Contact administrator.",
      });
    }

    // AI Security: Check for brute force attacks from this IP
    // const bruteForceCheck = await aiSecurity.detectBruteForce(ip, userAgent);
    // if (bruteForceCheck.shouldBlock) {
    //   await aiSecurity.logSecurityEvent(
    //     user.employee_id,
    //     "BRUTE_FORCE_BLOCKED",
    //     "critical",
    //     { ip, userAgent, attempts: bruteForceCheck.attempts }
    //   );
    //   return res.status(429).json({
    //     success: false,
    //     error: "Too many requests from this IP. Temporary block applied.",
    //   });
    // }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const failedAttempts = (user.failed_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null;

      await db("users").where("employee_id", user.employee_id).update({
        failed_attempts: failedAttempts,
        locked_until: lockUntil,
      });

      await db("login_attempts").insert({
        email: input,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        failure_reason: "invalid_password",
      });

      if (lockUntil) {
        return res.status(423).json({
          success: false,
          error: "Too many failed attempts. Account locked for 15 minutes.",
          lockedUntil: lockUntil,
        });
      }

      return res.status(401).json({
        success: false,
        error: `Invalid credentials. ${5 - failedAttempts} attempts remaining.`,
      });
    }

    // Check password expiry (90 days for admin roles)
    const adminRoles = ["root", "admin", "manager", "hr"];
    let mustChangePassword = false;
    let passwordExpiring = false;

    if (adminRoles.includes(user.role)) {
      const passwordExpiresAt = user.password_expires_at || new Date(new Date(user.created_at).getTime() + 90 * 24 * 60 * 60 * 1000);
      
      if (new Date(passwordExpiresAt) < now) {
        mustChangePassword = true;
      } else if (new Date(passwordExpiresAt) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        passwordExpiring = true;
      }
    }

    // Reset failed attempts on successful login
    await db("users").where("employee_id", user.employee_id).update({
      failed_attempts: 0,
      locked_until: null,
      last_login_at: now,
      login_count: (user.login_count || 0) + 1,
    });

    const tokenExpiry = rememberMe ? "30d" : config.JWT_EXPIRES_IN;
    const token = jwt.sign(
      { _id: user.employee_id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    const refreshToken = jwt.sign(
      { _id: user.employee_id, type: "refresh" },
      config.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Create session record
    const expiresAt = new Date(now.getTime() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);
    const deviceType = userAgent.toLowerCase().includes("mobile") ? "mobile" : "desktop";
    
    await db("login_sessions").insert({
      user_id: user.employee_id,
      token_hash: crypto.createHash("sha256").update(token).digest("hex"),
      ip_address: ip,
      user_agent: userAgent,
      device_type: deviceType,
      expires_at: expiresAt,
      remember_me: rememberMe || false,
    });

    await db("login_logs").insert({
      user_id: user.employee_id,
      ip_address: ip,
      user_agent: userAgent,
      status: "success",
    });

    await createOrUpdateAttendanceOnLogin(user.employee_id, "checkin");
    await logActivity(user.employee_id, "login", "auth", user.employee_id, { email: user.email, device: deviceType }, ip);

    // AI Security: Analyze login pattern
    // const loginAnalysis = await aiSecurity.analyzeLoginPattern(user.employee_id, ip, userAgent);
    // const riskReport = await aiSecurity.generateRiskReport(user.employee_id);

    // Log security event if high risk
    // if (loginAnalysis.riskLevel === "high" || riskReport.riskScore > 50) {
    //   await aiSecurity.logSecurityEvent(
    //     user.employee_id,
    //     "HIGH_RISK_LOGIN",
    //     loginAnalysis.riskLevel,
    //     { ip, userAgent, riskScore: riskReport.riskScore, factors: loginAnalysis }
    //   );
    // }

    res.json({
      success: true,
      token,
      refreshToken,
      expiresIn: tokenExpiry,
      mustChangePassword,
      passwordExpiring,
      user: {
        _id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        profileImage: user.profile_image,
        employeeId: user.employee_id,
        department: user.department,
        designation: user.designation,
      },
      security: {
        riskLevel: "low",
        isNewDevice: true,
        riskScore: 0,
      },
    });

    await db("login_attempts").insert({
      email: email,
      ip_address: ip,
      user_agent: userAgent,
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await createOrUpdateAttendanceOnLogin(req.user._id, "checkout");
    await logActivity(req.user._id, "logout", "auth", req.user._id, {}, req.ip);

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

    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
    }

    const user = await db("users").where("employee_id", decoded._id).first();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    const newToken = jwt.sign(
      { _id: user.employee_id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    const newRefreshToken = jwt.sign(
      { _id: user.employee_id, type: "refresh" },
      config.JWT_SECRET,
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
      .join("users", "login_logs.user_id", "users.employee_id")
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
      .join("users", "attendance.user_id", "users.employee_id")
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
      .join("users", "login_logs.user_id", "users.employee_id")
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

const validatePasswordComplexity = (password) => {
  const errors = [];
  if (password.length < 8) errors.push("at least 8 characters");
  if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (!/\d/.test(password)) errors.push("one number");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("one special character");
  return errors;
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;
    const adminRoles = ["root", "admin", "manager", "hr"];
    const user = await db("users").where("id", userId).first();

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Old password and new password are required",
      });
    }

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

    // Password complexity validation for admin roles
    if (adminRoles.includes(user.role)) {
      const complexityErrors = validatePasswordComplexity(newPassword);
      if (complexityErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Password must contain: ${complexityErrors.join(", ")}`,
        });
      }
    } else {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 6 characters",
        });
      }
    }

    // Check against password history (last 5 passwords)
    const recentPasswords = await db("password_history")
      .where("user_id", userId)
      .orderBy("created_at", "desc")
      .limit(5)
      .select("password_hash");

    for (const record of recentPasswords) {
      if (await bcrypt.compare(newPassword, record.password_hash)) {
        return res.status(400).json({
          success: false,
          error: "Cannot reuse any of your last 5 passwords",
        });
      }
    }

    // Save old password to history
    await db("password_history").insert({
      user_id: userId,
      reset_by: userId,
      password_hash: user.password,
    });

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    const passwordExpiresAt = adminRoles.includes(user.role) 
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      : null;

    await db("users")
      .where("id", userId)
      .update({
        password: hashedNewPassword,
        must_change_password: false,
        password_expires_at: passwordExpiresAt,
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

const resetUserPassword = async (req, res, next) => {
  try {
    const { userId, newPassword } = req.body;
    const requestingUserId = req.user._id;
    const requestingUserRole = req.user.role;

    // Only root can reset other users' passwords
    if (requestingUserRole !== "root") {
      return res.status(403).json({
        success: false,
        error: "Only root user can reset other users' passwords",
      });
    }

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "User ID and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    const user = await db("users").where("employee_id", userId).first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Save old password to history
    await db("password_history").insert({
      user_id: userId,
      reset_by: requestingUserId,
      password_hash: user.password,
    });

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await db("users")
      .where("employee_id", userId)
      .update({
        password: hashedNewPassword,
        updated_at: db.fn.now(),
      });

    // Log the activity
    await logActivity(requestingUserId, "reset_password", "auth", userId, { 
      targetUser: user.name, 
      targetEmail: user.email 
    }, req.ip);

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getPasswordHistory = async (req, res, next) => {
  try {
    const requestingUserId = req.user._id;
    const requestingUserRole = req.user.role;
    const { userId } = req.query;

    // Only root can view password history
    if (requestingUserRole !== "root") {
      return res.status(403).json({
        success: false,
        error: "Only root user can view password history",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    const history = await db("password_history")
      .where("user_id", userId)
      .orderBy("created_at", "desc")
      .limit(10);

    const user = await db("users").where("id", userId).first();

    res.json({
      success: true,
      user: user ? {
        _id: user.employee_id,
        name: user.name,
        email: user.email,
        employeeId: user.employee_id,
      } : null,
      history: history.map(h => ({
        _id: h.id,
        changedAt: h.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const getAllPasswordHistory = async (req, res, next) => {
  try {
    const requestingUserRole = req.user.role;

    // Only root can view password history
    if (requestingUserRole !== "root") {
      return res.status(403).json({
        success: false,
        error: "Only root user can view password history",
      });
    }

    const history = await db("password_history")
      .join("users as u", "password_history.user_id", "u.id")
      .leftJoin("users as rb", "password_history.reset_by", "rb.id")
      .select(
        "password_history.id",
        "password_history.created_at",
        "u.name as user_name",
        "u.email as user_email",
        "u.employee_id",
        "rb.name as reset_by_name"
      )
      .orderBy("password_history.created_at", "desc")
      .limit(100);

    res.json({
      success: true,
      history: history.map(h => ({
        _id: h.id,
        user: {
          name: h.user_name,
          email: h.user_email,
          employeeId: h.employee_id,
        },
        resetBy: h.reset_by_name,
        changedAt: h.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        error: "Employee ID is required",
      });
    }

    const input = employee_id.toUpperCase();
    const user = await db("users").where("employee_id", input).first();

    if (!user) {
      return res.json({
        success: true,
        message: "If an account exists with this Employee ID, a password reset request has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await db("users")
      .where("employee_id", user.employee_id)
      .update({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
      });

    await sendPasswordResetEmail(user.email, resetToken, user.name);

    res.json({
      success: true,
      message: "If an account exists with this Employee ID, a password reset request has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: "Token and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
    }

    const user = await db("users")
      .where("reset_token", token)
      .where("reset_token_expiry", ">", new Date())
      .first();

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db("users")
      .where("employee_id", user.employee_id)
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      });

    res.json({
      success: true,
      message: "Password reset successful. Please login with your new password.",
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
      .where("employee_id", req.user._id)
      .select(
        "employee_id",
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
        _id: user.employee_id,
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

const getSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const currentToken = req.headers.authorization?.replace("Bearer ", "");
    const currentTokenHash = currentToken ? crypto.createHash("sha256").update(currentToken).digest("hex") : null;

    const sessions = await db("login_sessions")
      .where("user_id", userId)
      .where("is_active", true)
      .where("expires_at", ">", new Date())
      .orderBy("last_active_at", "desc");

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        _id: s.id,
        device: s.device_type === "mobile" ? "Mobile Device" : "Desktop",
        browser: s.user_agent?.split(" ").slice(0, 2).join(" ") || "Unknown",
        location: s.location || "Unknown",
        ipAddress: s.ip_address,
        deviceType: s.device_type,
        loginAt: s.login_at,
        lastActiveAt: s.last_active_at,
        isCurrent: s.token_hash === currentTokenHash,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const terminateSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await db("login_sessions")
      .where("id", sessionId)
      .where("user_id", userId)
      .first();

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    if (session.token_hash) {
      await db("token_blacklist").insert({
        token_hash: session.token_hash,
        expires_at: session.expires_at,
        blacklisted_at: new Date(),
      }).catch(() => {});
    }

    await db("login_sessions")
      .where("id", sessionId)
      .update({ is_active: false });

    res.json({
      success: true,
      message: "Session terminated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const terminateAllSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const currentToken = req.headers.authorization?.replace("Bearer ", "");
    const currentTokenHash = currentToken ? crypto.createHash("sha256").update(currentToken).digest("hex") : null;

    const sessionsToTerminate = await db("login_sessions")
      .where("user_id", userId)
      .where("is_active", true)
      .where("token_hash", "!=", currentTokenHash)
      .select("token_hash", "expires_at");

    for (const session of sessionsToTerminate) {
      await db("token_blacklist").insert({
        token_hash: session.token_hash,
        expires_at: session.expires_at,
        blacklisted_at: new Date(),
      }).catch(() => {});
    }

    await db("login_sessions")
      .where("user_id", userId)
      .where("is_active", true)
      .where("token_hash", "!=", currentTokenHash)
      .update({ is_active: false });

    res.json({
      success: true,
      message: "All other sessions terminated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const sendLoginNotification = async (userId, ip, deviceType) => {
  try {
    const user = await db("users").where("id", userId).first();
    if (!user || !user.email) return;

    // Check if user has email notifications enabled
    const preferences = await db("user_preferences").where("user_id", userId).first();
    if (preferences && !preferences.email_notifications) return;

    // For now, we'll just log this - in production, you would send an actual email
    await logActivity(userId, "login_alert", "security", userId, {
      ip,
      device: deviceType,
      type: "new_device_login",
    }, ip);
  } catch (error) {
    console.error("Login notification error:", error);
  }
};

export { login, logout, refreshAccessToken, changePassword, forgotPassword, resetPassword, uploadAvatar, getProfile, getLoginLogs, exportEmployeesExcel, exportAttendanceExcel, exportLoginLogsExcel, resetUserPassword, getPasswordHistory, getAllPasswordHistory, getSessions, terminateSession, terminateAllSessions };
