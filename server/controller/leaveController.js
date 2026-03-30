import db from "../config/database.js";
import { createNotification } from "./notificationController.js";
import { updateBalance, getOrCreateBalance } from "./leaveBalanceController.js";
import { logActivity } from "./activityLogController.js";

const canApprove = (role) => ["root", "admin", "manager"].includes(role);

const VALID_LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Casual Leave", "unpaid"];

const createLeave = async (req, res, next) => {
  try {
    const { type, from, to, description } = req.body;
    const userId = req.user._id;

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

    const fromDate = new Date(from);
    const toDate = new Date(to);
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

    const [leave] = await db("leaves")
      .insert({
        user_id: userId,
        type,
        from_date: fromDate,
        to_date: toDate,
        description: description || null,
        status: "Pending",
      })
      .returning("*");

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
    
    await logActivity(userId, "create", "leave", leave.id, { type, from, to }, req.ip);
  } catch (error) {
    next(error);
  }
};

const listLeaves = async (req, res, next) => {
  try {
    const { status, userId } = req.query;

    let query = db("leaves")
      .join("users", "leaves.user_id", "users.employee_id")
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
      .orderBy("leaves.created_at", "desc")
      .limit(500);

    if (status && status !== "All") {
      query = query.where("leaves.status", status);
    }

    if (userId) {
      query = query.where("leaves.user_id", userId);
    }

    const leaves = await query;

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

    const [leave] = await db("leaves")
      .where("id", id)
      .update({
        status,
        updated_at: db.fn.now(),
      })
      .returning("*");

    const year = new Date(leave.from_date).getFullYear();
    const fromDate = new Date(leave.from_date);
    const toDate = new Date(leave.to_date);
    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

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
    
    await logActivity(req.user._id, status.toLowerCase(), "leave", id, { type: leave.type, previousStatus: oldLeave.status }, req.ip);
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
    if (leave.user_id !== req.user._id) {
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
