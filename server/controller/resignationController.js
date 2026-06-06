import db from "../config/database.js";
import crypto from "crypto";
import { createNotification } from "./notificationController.js";
import { logActivity } from "./activityLogController.js";
import { resolveUserId } from "../utils/dbUtils.js";
import { getProjectDateStr } from "../utils/dateUtils.js";

const canManageResignations = (role) => ["root", "admin", "manager"].includes(role);

const submitResignation = async (req, res, next) => {
  try {
    const { reason, lastWorkingDay } = req.body;

    if (!reason || !lastWorkingDay) {
      return res.status(400).json({ success: false, error: "Reason and last working day are required" });
    }

    const existing = await db("resignations")
      .where("user_id", req.user.id)
      .whereIn("status", ["Pending", "Approved"])
      .first();

    if (existing) {
      return res.status(400).json({ success: false, error: "You already have a pending or approved resignation" });
    }

    const id = crypto.randomUUID();
    await db("resignations").insert({
      id,
      user_id: req.user.id,
      reason,
      last_working_day: lastWorkingDay,
      status: "Pending",
    });

    const resignation = await db("resignations").where("id", id).first();

    await logActivity(req.user.id, "submit", "resignation", id, { reason, lastWorkingDay }, req.ip);

    res.status(201).json({ success: true, resignation });
  } catch (error) {
    next(error);
  }
};

const listResignations = async (req, res, next) => {
  try {
    const { status, userId, page, limit } = req.query;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (currentPage - 1) * pageSize;

    const query = db("resignations")
      .join("users", "resignations.user_id", "users.id")
      .leftJoin("users as approvers", "resignations.approved_by", "approvers.id")
      .select(
        "resignations.*",
        "users.name as user_name",
        "users.employee_id",
        "users.department",
        "approvers.name as approved_by_name"
      )
      .orderBy("resignations.created_at", "desc");

    if (status) query.where("resignations.status", status);

    if (canManageResignations(req.user.role)) {
      if (userId) {
        const resolvedId = await resolveUserId(userId);
        if (resolvedId) {
          query.where("resignations.user_id", resolvedId);
        } else {
          return res.json({ success: true, resignations: [], pagination: { page: currentPage, limit: pageSize, total: 0, pages: 0 } });
        }
      }
    } else {
      query.where("resignations.user_id", req.user.id);
    }

    const [{ count }] = await query.clone().clearSelect().count("* as count");
    const records = await query.clone().limit(pageSize).offset(offset);

    res.json({
      success: true,
      resignations: records,
      pagination: { page: currentPage, limit: pageSize, total: parseInt(count), pages: Math.ceil(parseInt(count) / pageSize) },
    });
  } catch (error) {
    next(error);
  }
};

const updateResignationStatus = async (req, res, next) => {
  try {
    if (!canManageResignations(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const resignation = await db("resignations").where("id", id).first();
    if (!resignation) {
      return res.status(404).json({ success: false, error: "Resignation not found" });
    }

    if (resignation.status !== "Pending") {
      return res.status(400).json({ success: false, error: "Resignation already processed" });
    }

    await db("resignations").where("id", id).update({
      status,
      approved_by: req.user.id,
      approved_at: db.fn.now(),
      admin_notes: adminNotes || null,
      updated_at: db.fn.now(),
    });

    await createNotification(
      resignation.user_id,
      `Resignation ${status}`,
      `Your resignation has been ${status.toLowerCase()}.${adminNotes ? ` Notes: ${adminNotes}` : ""}`,
      status === "Approved" ? "info" : "warning"
    );

    await logActivity(req.user.id, status.toLowerCase(), "resignation", id, { previousStatus: resignation.status, adminNotes }, req.ip);

    res.json({ success: true, message: `Resignation ${status.toLowerCase()}` });
  } catch (error) {
    next(error);
  }
};

export { submitResignation, listResignations, updateResignationStatus };
