import db from "../config/database.js";
import crypto from "crypto";
import { logActivity } from "./activityLogController.js";
import { resolveUserId } from "../utils/dbUtils.js";

const generateSlip = async (req, res, next) => {
  try {
    const { payrollId } = req.body;

    if (!payrollId) {
      return res.status(400).json({ success: false, error: "payrollId is required" });
    }

    const payroll = await db("payroll").where("id", payrollId).first();
    if (!payroll) {
      return res.status(404).json({ success: false, error: "Payroll record not found" });
    }

    const periodStart = new Date(payroll.pay_period_start);
    // Standardized month name using fixed array to avoid locale drift
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[periodStart.getMonth()];
    const year = periodStart.getFullYear();

    const existing = await db("salary_slips")
      .where("user_id", payroll.user_id)
      .where("month", month)
      .where("year", year)
      .first();

    if (existing) {
      return res.json({ success: true, slip: existing, message: "Salary slip already exists" });
    }

    const id = crypto.randomUUID();
    await db("salary_slips").insert({
      id,
      user_id: payroll.user_id,
      payroll_id: payrollId,
      basic_pay: payroll.basic_pay,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      net_pay: payroll.net_pay,
      month,
      year,
    });

    const slip = await db("salary_slips").where("id", id).first();

    await logActivity(req.user.id, "generate", "salary_slip", id, { userId: payroll.user_id, month, year }, req.ip);

    res.status(201).json({ success: true, slip });
  } catch (error) {
    next(error);
  }
};

const canViewAllSlips = (role) => ["root", "admin", "manager"].includes(role);

const listSlips = async (req, res, next) => {
  try {
    const { userId, year, page, limit } = req.query;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (currentPage - 1) * pageSize;

    const query = db("salary_slips")
      .join("users", "salary_slips.user_id", "users.id")
      .select("salary_slips.*", "users.name as user_name", "users.employee_id", "users.department")
      .orderBy("salary_slips.year", "desc")
      .orderBy("salary_slips.month", "desc");

    if (canViewAllSlips(req.user.role)) {
      if (userId) {
        const resolvedId = await resolveUserId(userId);
        if (resolvedId) {
          query.where("salary_slips.user_id", resolvedId);
        } else {
          return res.json({ success: true, slips: [], pagination: { page: currentPage, limit: pageSize, total: 0, pages: 0 } });
        }
      }
    } else {
      query.where("salary_slips.user_id", req.user.id);
    }
    if (year) query.where("salary_slips.year", parseInt(year));

    const [{ count }] = await query.clone().clearSelect().count("* as count");
    const records = await query.clone().limit(pageSize).offset(offset);

    res.json({
      success: true,
      slips: records,
      pagination: { page: currentPage, limit: pageSize, total: parseInt(count), pages: Math.ceil(parseInt(count) / pageSize) },
    });
  } catch (error) {
    next(error);
  }
};

const markDownloaded = async (req, res, next) => {
  try {
    const slip = await db("salary_slips").where("id", req.params.id).first();
    if (!slip) return res.status(404).json({ success: false, error: "Salary slip not found" });

    // Check ownership
    if (!canViewAllSlips(req.user.role) && slip.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    await db("salary_slips").where("id", req.params.id).update({ downloaded_at: db.fn.now() });

    res.json({ success: true, message: "Download recorded" });
  } catch (error) {
    next(error);
  }
};

export { generateSlip, listSlips, markDownloaded };
