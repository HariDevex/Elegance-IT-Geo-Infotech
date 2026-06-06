import db from "../config/database.js";
import crypto from "crypto";
import { logActivity } from "./activityLogController.js";
import { resolveUserId } from "../utils/dbUtils.js";

const canManageOnboarding = (role) => ["root", "admin", "manager", "hr"].includes(role);

const createTask = async (req, res, next) => {
  try {
    if (!canManageOnboarding(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    let { userId, taskName, description, assignedTo, dueDate } = req.body;
    if (!userId || !taskName) {
      return res.status(400).json({ success: false, error: "userId and taskName are required" });
    }

    const resolvedId = await resolveUserId(userId);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const id = crypto.randomUUID();
    await db("onboarding_tasks").insert({
      id,
      user_id: resolvedId,
      task_name: taskName,
      description: description || null,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      status: "pending",
    });

    const task = await db("onboarding_tasks").where("id", id).first();

    await logActivity(req.user.id, "create", "onboarding", id, { userId: resolvedId, taskName }, req.ip);

    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

const listTasks = async (req, res, next) => {
  try {
    const { userId, status, page, limit } = req.query;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (currentPage - 1) * pageSize;

    const query = db("onboarding_tasks")
      .join("users", "onboarding_tasks.user_id", "users.id")
      .leftJoin("users as assignees", "onboarding_tasks.assigned_to", "assignees.id")
      .select(
        "onboarding_tasks.*",
        "users.name as user_name",
        "users.employee_id",
        "assignees.name as assigned_to_name"
      )
      .orderBy("onboarding_tasks.created_at", "desc");

    if (userId) {
      const resolvedId = await resolveUserId(userId);
      if (resolvedId) {
        query.where("onboarding_tasks.user_id", resolvedId);
      } else {
        return res.json({ success: true, tasks: [], pagination: { page: currentPage, limit: pageSize, total: 0, pages: 0 } });
      }
    }
    
    if (status) query.where("onboarding_tasks.status", status);

    const [{ count }] = await query.clone().clearSelect().count("* as count");
    const records = await query.clone().limit(pageSize).offset(offset);

    res.json({
      success: true,
      tasks: records,
      pagination: { page: currentPage, limit: pageSize, total: parseInt(count), pages: Math.ceil(parseInt(count) / pageSize) },
    });
  } catch (error) {
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const task = await db("onboarding_tasks").where("id", id).first();
    if (!task) return res.status(404).json({ success: false, error: "Task not found" });

    const updateData = { status, updated_at: db.fn.now() };
    if (status === "completed") updateData.completed_at = db.fn.now();

    await db("onboarding_tasks").where("id", id).update(updateData);

    res.json({ success: true, message: "Task updated" });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    if (!canManageOnboarding(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    await db("onboarding_tasks").where("id", req.params.id).del();
    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    next(error);
  }
};

const createChecklistItem = async (req, res, next) => {
  try {
    let { userId, item } = req.body;
    if (!userId || !item) {
      return res.status(400).json({ success: false, error: "userId and item are required" });
    }

    const resolvedId = await resolveUserId(userId);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const id = crypto.randomUUID();
    await db("onboarding_checklist").insert({ id, user_id: resolvedId, item });

    const checklistItem = await db("onboarding_checklist").where("id", id).first();
    res.status(201).json({ success: true, checklistItem });
  } catch (error) {
    next(error);
  }
};

const listChecklist = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const query = db("onboarding_checklist").orderBy("created_at", "asc");
    
    if (userId) {
      const resolvedId = await resolveUserId(userId);
      if (resolvedId) {
        query.where("user_id", resolvedId);
      } else {
        return res.json({ success: true, checklist: [] });
      }
    }

    const items = await query;
    res.json({ success: true, checklist: items });
  } catch (error) {
    next(error);
  }
};

const toggleChecklistItem = async (req, res, next) => {
  try {
    const item = await db("onboarding_checklist").where("id", req.params.id).first();
    if (!item) return res.status(404).json({ success: false, error: "Checklist item not found" });

    const newStatus = !item.is_completed;
    await db("onboarding_checklist").where("id", req.params.id).update({
      is_completed: newStatus,
      completed_at: newStatus ? db.fn.now() : null,
    });

    res.json({ success: true, is_completed: newStatus });
  } catch (error) {
    next(error);
  }
};

export { createTask, listTasks, updateTaskStatus, deleteTask, createChecklistItem, listChecklist, toggleChecklistItem };
