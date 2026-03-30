import db from "../config/database.js";
import { logActivity } from "./activityLogController.js";

const canPublish = (role) =>
  ["root", "admin", "manager", "hr", "teamlead", "developer"].includes(role);

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, audienceRoles = ["all"], audienceDepartments = [] } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: "Title and message are required",
      });
    }

    if (!canPublish(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to create announcements",
      });
    }

    const roles = audienceRoles?.length ? audienceRoles : ["all"];
    const depts = audienceDepartments?.length ? audienceDepartments : [];
    
    const [announcement] = await db("announcements")
      .insert({
        title: title.trim(),
        message: message.trim(),
        audience_roles: JSON.stringify(roles),
        audience_departments: JSON.stringify(depts),
        created_by: req.user._id,
      })
      .returning("*");

    // Get creator info
    const creator = await db("users")
      .where("employee_id", req.user._id)
      .first();

    res.status(201).json({
      success: true,
      announcement: {
        _id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        audienceRoles: announcement.audience_roles,
        audienceDepartments: announcement.audience_departments,
        createdBy: {
          _id: creator.id,
          name: creator.name,
          role: creator.role,
        },
        createdAt: announcement.created_at,
      },
    });
    
    await logActivity(req.user._id, "create", "announcement", announcement.id, { title }, req.ip);
  } catch (error) {
    next(error);
  }
};

const listAnnouncements = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userDepartment = req.user.department;

    const announcements = await db("announcements")
      .leftJoin("users", "announcements.created_by", "users.employee_id")
      .select(
        "announcements.id",
        "announcements.title",
        "announcements.message",
        "announcements.audience_roles",
        "announcements.audience_departments",
        "announcements.created_at",
        "users.employee_id as creator_id",
        "users.name as creator_name",
        "users.role as creator_role"
      )
      .where((builder) => {
        builder
          .whereRaw("announcements.audience_roles LIKE ?", ["%\"all\"%"])
          .orWhereRaw("announcements.audience_roles LIKE ?", [`%"${userRole}"%`]);
        if (userDepartment) {
          builder.orWhereRaw("announcements.audience_departments LIKE ?", [`%"${userDepartment}"%`]);
        }
      })
      .orderBy("announcements.created_at", "desc")
      .limit(100);

    res.json({
      success: true,
      announcements: announcements.map((a) => ({
        _id: a.id,
        title: a.title,
        message: a.message,
        audienceRoles: (() => {
          try { return typeof a.audience_roles === 'string' ? JSON.parse(a.audience_roles) : a.audience_roles; }
          catch { return ["all"]; }
        })(),
        audienceDepartments: (() => {
          try { return typeof a.audience_departments === 'string' ? JSON.parse(a.audience_departments) : a.audience_departments; }
          catch { return []; }
        })(),
        createdBy: {
          _id: a.creator_id,
          name: a.creator_name,
          role: a.creator_role,
        },
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    const announcement = await db("announcements").where("id", id).first();

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: "Announcement not found",
      });
    }

    // Only creator or root can delete
    if (announcement.created_by !== req.user._id && req.user.role !== "root") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this announcement",
      });
    }

    await db("announcements").where("id", id).del();

    res.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { createAnnouncement, listAnnouncements, deleteAnnouncement };
