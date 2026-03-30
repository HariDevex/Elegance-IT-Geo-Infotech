import db from "../config/database.js";
import crypto from "crypto";
import { uploadFile } from "../utils/supabaseStorage.js";

const createGroup = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Group name must be at least 2 characters",
      });
    }

    if (name.length > 50) {
      return res.status(400).json({
        success: false,
        error: "Group name must be less than 50 characters",
      });
    }

    const generateUUID = () => {
      return crypto.randomUUID();
    };

    const groupId = generateUUID();

    const [group] = await db("chat_groups")
      .insert({
        id: groupId,
        name: name.trim(),
        description: description?.trim() || null,
        created_by: req.user._id,
      })
      .returning("*");

    res.status(201).json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        createdBy: req.user._id,
        createdAt: group.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const listGroups = async (req, res, next) => {
  try {
    const groups = await db("chat_groups")
      .leftJoin("users", "chat_groups.created_by", "users.employee_id")
      .select(
        "chat_groups.id",
        "chat_groups.name",
        "chat_groups.description",
        "chat_groups.created_at",
        "users.name as creator_name"
      )
      .orderBy("chat_groups.created_at", "desc")
      .limit(100);

    res.json({
      success: true,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        creatorName: g.creator_name,
        createdAt: g.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await db("chat_groups").where("id", id).first();

    if (!group) {
      return res.status(404).json({
        success: false,
        error: "Group not found",
      });
    }

    if (group.created_by !== req.user._id && req.user.role !== "root") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this group",
      });
    }

    await db("chat_groups").where("id", id).del();

    res.json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { contactId, type = "direct" } = req.query;

    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: "contactId is required",
      });
    }

    let messages;

    if (type === "group") {
      messages = await db("chat_messages")
        .join("users", "chat_messages.from_user", "users.employee_id")
        .select(
          "chat_messages.id",
          "chat_messages.text",
          "chat_messages.ts",
          "users.employee_id as from_id",
          "users.name as from_name"
        )
        .where("chat_messages.to_group", contactId)
        .orderBy("chat_messages.ts", "asc")
        .limit(500);
    } else {
      messages = await db("chat_messages")
        .join("users", "chat_messages.from_user", "users.employee_id")
        .select(
          "chat_messages.id",
          "chat_messages.text",
          "chat_messages.ts",
          "chat_messages.to_user",
          "users.employee_id as from_id",
          "users.name as from_name"
        )
        .where((builder) => {
          builder
            .where("chat_messages.from_user", req.user._id)
            .where("chat_messages.to_user", contactId);
        })
        .orWhere((builder) => {
          builder
            .where("chat_messages.from_user", contactId)
            .where("chat_messages.to_user", req.user._id);
        })
        .orderBy("chat_messages.ts", "asc")
        .limit(500);
    }

    res.json({
      success: true,
      messages: messages.map((m) => ({
        _id: m.id,
        text: m.text,
        ts: m.ts,
        from: {
          _id: m.from_id,
          name: m.from_name,
        },
        isYou: m.from_id === req.user._id,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { contactId, type = "direct", text } = req.body;

    if (!contactId || !text) {
      return res.status(400).json({
        success: false,
        error: "contactId and text are required",
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: "Message too long (max 5000 characters)",
      });
    }

    let attachmentUrl = null;
    if (req.file) {
      attachmentUrl = await uploadFile(req.file, "chat-attachments");
    }

    let message;

    if (type === "group") {
      [message] = await db("chat_messages")
        .insert({
          from_user: req.user._id,
          to_group: contactId,
          text: text.trim(),
          attachment: attachmentUrl,
        })
        .returning("*");
    } else {
      [message] = await db("chat_messages")
        .insert({
          from_user: req.user._id,
          to_user: contactId,
          text: text.trim(),
          attachment: attachmentUrl,
        })
        .returning("*");
    }

    const sender = await db("users").where("employee_id", req.user._id).first();

    res.status(201).json({
      success: true,
      message: {
        _id: message.id,
        text: message.text,
        ts: message.ts,
        attachment: message.attachment,
        from: {
          _id: sender.employee_id,
          name: sender.name,
        },
        isYou: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { getMessages, sendMessage, createGroup, listGroups, deleteGroup };
