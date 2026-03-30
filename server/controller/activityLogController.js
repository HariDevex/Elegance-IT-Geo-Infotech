import db from "../config/database.js";

const logActivity = async (userId, action, module, targetId = null, details = null, ipAddress = null) => {
  try {
    await db("activity_logs").insert({
      user_id: userId,
      action,
      module,
      target_id: targetId,
      details: details ? JSON.stringify(details) : null,
      ip_address: ipAddress,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

const getActivityLogs = async (req, res, next) => {
  try {
    const { module, action, userId, from, to, limit = 100, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let query = db("activity_logs")
      .leftJoin("users", "activity_logs.user_id", "users.employee_id")
      .select(
        "activity_logs.*",
        "users.name as user_name",
        "users.email as user_email"
      )
      .orderBy("activity_logs.created_at", "desc")
      .limit(parseInt(limit))
      .offset(offset);

    if (module) {
      query = query.where("activity_logs.module", module);
    }
    if (action) {
      query = query.where("activity_logs.action", action);
    }
    if (userId) {
      query = query.where("activity_logs.user_id", userId);
    }
    if (from && to) {
      query = query.whereBetween("activity_logs.created_at", [new Date(from), new Date(to)]);
    }

    const logs = await query;

    const countQuery = db("activity_logs").count("* as count");
    if (module) countQuery.where("module", module);
    if (action) countQuery.where("action", action);
    if (userId) countQuery.where("user_id", userId);
    const countResult = await countQuery.first();

    res.json({
      success: true,
      logs: logs.map(l => ({
        _id: l.id,
        action: l.action,
        module: l.module,
        targetId: l.target_id,
        details: l.details ? JSON.parse(l.details) : null,
        ipAddress: l.ip_address,
        createdAt: l.created_at,
        user: {
          _id: l.user_id,
          name: l.user_name,
          email: l.user_email,
        },
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult?.count || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { logActivity, getActivityLogs };
