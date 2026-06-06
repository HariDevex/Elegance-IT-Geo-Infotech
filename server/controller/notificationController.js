import db from "../config/database.js";
import crypto from "crypto";

const createNotification = async (userId, title, message, type = "info", link = null) => {
  const id = crypto.randomUUID();
  const [notification] = await db("notifications")
    .insert({
      id,
      user_id: userId,
      title,
      message,
      type,
      link,
    })
    .returning("*");

  return { ...notification, _id: notification.id };
};

const notifyUser = async (userId, title, message, type = "info") => {
  return createNotification(userId, title, message, type);
};

const notifyRole = async (roles, title, message, type = "info") => {
  const users = await db("users").whereIn("role", roles).select("id");
  const notifications = users.map(user => ({
    user_id: user.id,
    title,
    message,
    type,
  }));

  if (notifications.length > 0) {
    await db("notifications").insert(notifications);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;
    const userId = req.user.id;

    let query = db("notifications")
      .where("user_id", userId)
      .orderBy("created_at", "desc")
      .limit(parseInt(limit));

    if (unreadOnly === "true") {
      query = query.where("is_read", false);
    }

    const notifications = await query;

    const unreadCount = await db("notifications")
      .where("user_id", userId)
      .where("is_read", false)
      .count("* as count")
      .first();

    res.json({
      success: true,
      notifications: notifications.map(n => ({
        _id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        link: n.link,
        createdAt: n.created_at,
      })),
      unreadCount: parseInt(unreadCount?.count) || 0,
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db("notifications")
      .where("id", id)
      .where("user_id", userId)
      .update({ is_read: true });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await db("notifications")
      .where("user_id", userId)
      .where("is_read", false)
      .update({ is_read: true });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db("notifications")
      .where("id", id)
      .where("user_id", userId)
      .del();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export {
  createNotification,
  notifyUser,
  notifyRole,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
