import db from "../config/database.js";
import { createNotification } from "./notificationController.js";
import { updateBalance, getOrCreateBalance } from "./leaveBalanceController.js";
import { logActivity } from "./activityLogController.js";
import { invalidateCache } from "../utils/responseCache.js";
import crypto from "crypto";

const canApprove = (role) => ["root", "admin", "manager", "teamlead", "hr"].includes(role);

const VALID_LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Casual Leave", "unpaid"];

const countWeekdays = (from, to) => {
  let count = 0;
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    if (current.getDay() !== 0) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const createLeave = async (req, res, next) => {
  try {
    const { type, from, to, description } = req.body;
    const userId = req.user.id;

    if (!type || !from || !to) {
      return res.status(400).json({
        success: false,
        error: "Type, from date, and to date are required",
      });
    }

    if (!VALID_LEAVE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid leave type. Must be one of: ${VALID_LEAVE_TYPES.join(", ")}`,
      });
    }

    const [fromY, fromM, fromD] = from.split('-').map(Number);
    const [toY, toM, toD] = to.split('-').map(Number);
    const fromDate = new Date(fromY, fromM - 1, fromD);
    const toDate = new Date(toY, toM - 1, toD);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    if (fromDate < today) {
      return res.status(400).json({
        success: false,
        error: "From date cannot be in the past",
      });
    }

    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        error: "From date cannot be after to date",
      });
    }

    const existingLeaves = await db("leaves")
      .where("user_id", userId)
      .whereIn("status", ["Pending", "Approved"])
      .where((builder) => {
        builder
          .whereBetween("from_date", [fromDate, toDate])
          .orWhereBetween("to_date", [fromDate, toDate])
          .orWhere((b) => {
            b.where("from_date", "<=", fromDate).where("to_date", ">=", toDate);
          });
      });

    if (existingLeaves.length > 0) {
      return res.status(400).json({
        success: false,
        error: "You already have a leave application for these dates",
      });
    }

    const leaveId = crypto.randomUUID();
    await db("leaves").insert({
      id: leaveId,
      user_id: req.user.id,
      type,
      from_date: fromDate,
      to_date: toDate,
      description: description || null,
      status: "Pending",
    });

    const leave = await db("leaves").where("id", leaveId).first();

    // Get user info
    const user = await db("users").where("id", userId).first();

    res.status(201).json({
      success: true,
      leave: {
        _id: leave.id,
        type: leave.type,
        from: leave.from_date,
        to: leave.to_date,
        description: leave.description,
        status: leave.status,
        user: {
          _id: user.id,
          name: user.name,
          employeeId: user.employee_id,
          department: user.department,
          role: user.role,
        },
        createdAt: leave.created_at,
      },
    });
    
    await logActivity(req.user.id, "create", "leave", leave.id, { type, from, to }, req.ip);
  } catch (error) {
    next(error);
  }
};

const listLeaves = async (req, res, next) => {
  try {
    const { status, userId, page, limit } = req.query;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (currentPage - 1) * pageSize;

    let query = db("leaves")
      .join("users", "leaves.user_id", "users.id")
      .select(
        "leaves.id",
        "leaves.type",
        "leaves.from_date",
        "leaves.to_date",
        "leaves.description",
        "leaves.status",
        "leaves.created_at",
        "users.employee_id as user_id",
        "users.name as user_name",
        "users.employee_id",
        "users.department",
        "users.role"
      )
      .orderBy("leaves.created_at", "desc");

    if (status && status !== "All") {
      query = query.where("leaves.status", status);
    }

    if (userId) {
      query = query.where("leaves.user_id", userId);
    }

    const [{ count }] = await query.clone().clearSelect().clearOrder().count("* as count");
    const leaves = await query.clone().limit(pageSize).offset(offset);

    res.json({
      success: true,
      leaves: leaves.map((l) => ({
        _id: l.id,
        type: l.type,
        from: l.from_date,
        to: l.to_date,
        description: l.description,
        status: l.status,
        createdAt: l.created_at,
        user: {
          _id: l.user_id,
          name: l.user_name,
          employeeId: l.employee_id,
          department: l.department,
          role: l.role,
        },
      })),
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

const updateLeaveStatus = async (req, res, next) => {
  try {
    if (!canApprove(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to approve/reject leaves",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
      });
    }

    const oldLeave = await db("leaves").where("id", id).first();
    if (!oldLeave) {
      return res.status(404).json({
        success: false,
        error: "Leave not found",
      });
    }

    const updatedCount = await db("leaves")
      .where("id", id)
      .update({
        status,
        updated_at: db.fn.now(),
      });

    const leave = await db("leaves").where("id", id).first();

    const year = new Date(leave.from_date).getFullYear();
    const fromDate = new Date(leave.from_date);
    const toDate = new Date(leave.to_date);
    const days = countWeekdays(fromDate, toDate) || 1;

    // Map leave type to balance type
    const leaveTypeMap = {
      "Annual Leave": "annual",
      "Sick Leave": "sick",
      "Casual Leave": "casual",
      "unpaid": "unpaid",
    };
    const balanceType = leaveTypeMap[leave.type] || "casual";

    // Update leave balance
    if (status === "Approved") {
      await updateBalance(leave.user_id, balanceType, days, year);
    } else if (status === "Rejected" && oldLeave.status === "Pending") {
      // If rejecting a pending leave, no balance change needed
    } else if (status === "Rejected" && oldLeave.status === "Approved") {
      // If rejecting an already approved leave, deduct from used
      await updateBalance(leave.user_id, balanceType, -days, year);
    }

    // Invalidate leave balance cache
    invalidateCache("leave-balance");

    // Send notification
    const user = await db("users").where("id", leave.user_id).first();
    if (user) {
      if (status === "Approved") {
        await createNotification(
          leave.user_id,
          "Leave Approved",
          `Your ${leave.type} request for ${days} day(s) has been approved.`,
          "success"
        );
      } else if (status === "Rejected") {
        await createNotification(
          leave.user_id,
          "Leave Rejected",
          `Your ${leave.type} request has been rejected.`,
          "error"
        );
      }
    }

    res.json({
      success: true,
      leave: {
        _id: leave.id,
        type: leave.type,
        from: leave.from_date,
        to: leave.to_date,
        description: leave.description,
        status: leave.status,
        createdAt: leave.created_at,
      },
    });
    
    await logActivity(req.user.id, status.toLowerCase(), "leave", id, { type: leave.type, previousStatus: oldLeave.status }, req.ip);
  } catch (error) {
    next(error);
  }
};

const deleteLeave = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Users can delete their own pending leaves
    const leave = await db("leaves").where("id", id).first();

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: "Leave not found",
      });
    }

    // Only allow deletion of own pending leaves
    if (leave.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this leave",
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        error: "Can only delete pending leave requests",
      });
    }

    await db("leaves").where("id", id).del();

    res.json({
      success: true,
      message: "Leave deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { createLeave, listLeaves, updateLeaveStatus, deleteLeave };
