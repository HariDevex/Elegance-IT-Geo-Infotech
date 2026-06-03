import db from "../config/database.js";
import crypto from "crypto";
import { logActivity } from "./activityLogController.js";

const canManagePayroll = (role) => ["root", "admin", "manager"].includes(role);
const canViewAllPayroll = (role) => ["root", "admin", "manager"].includes(role);

const processPayroll = async (req, res, next) => {
  try {
    if (!canManagePayroll(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { userId, basicPay, allowances, deductions, payPeriodStart, payPeriodEnd, paymentDate } = req.body;

    if (!userId || !payPeriodStart || !payPeriodEnd) {
      return res.status(400).json({ success: false, error: "userId, payPeriodStart, and payPeriodEnd are required" });
    }

    const user = await db("users").where("id", userId).first();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const basic = parseFloat(basicPay) || 0;
    const allow = parseFloat(allowances) || 0;
    const deduct = parseFloat(deductions) || 0;
    const netPay = basic + allow - deduct;

    const existing = await db("payroll")
      .where("user_id", userId)
      .where("pay_period_start", payPeriodStart)
      .where("pay_period_end", payPeriodEnd)
      .first();

    let payroll;
    if (existing) {
      await db("payroll").where("id", existing.id).update({
        basic_pay: basic,
        allowances: allow,
        deductions: deduct,
        net_pay: netPay,
        payment_date: paymentDate || null,
        status: "processed",
        updated_at: db.fn.now(),
      });
      payroll = await db("payroll").where("id", existing.id).first();
    } else {
      const id = crypto.randomUUID();
      await db("payroll").insert({
        id,
        user_id: userId,
        basic_pay: basic,
        allowances: allow,
        deductions: deduct,
        net_pay: netPay,
        pay_period_start: payPeriodStart,
        pay_period_end: payPeriodEnd,
        payment_date: paymentDate || null,
        status: "processed",
      });
      payroll = await db("payroll").where("id", id).first();
    }

    await logActivity(req.user.id, "process_payroll", "payroll", payroll.id, { userId, netPay, period: `${payPeriodStart} to ${payPeriodEnd}` }, req.ip);

    res.json({ success: true, payroll });
  } catch (error) {
    next(error);
  }
};

const listPayroll = async (req, res, next) => {
  try {
    const { userId, status, page, limit } = req.query;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (currentPage - 1) * pageSize;

    const query = db("payroll")
      .join("users", "payroll.user_id", "users.id")
      .select("payroll.*", "users.name as user_name", "users.employee_id", "users.department")
      .orderBy("payroll.created_at", "desc");

    if (canViewAllPayroll(req.user.role)) {
      if (userId) query.where("payroll.user_id", userId);
    } else {
      query.where("payroll.user_id", req.user.id);
    }
    if (status) query.where("payroll.status", status);

    const [{ count }] = await query.clone().clearSelect().count("* as count");
    const records = await query.clone().limit(pageSize).offset(offset);

    res.json({
      success: true,
      payroll: records,
      pagination: { page: currentPage, limit: pageSize, total: parseInt(count), pages: Math.ceil(parseInt(count) / pageSize) },
    });
  } catch (error) {
    next(error);
  }
};

const getPayroll = async (req, res, next) => {
  try {
    const record = await db("payroll")
      .join("users", "payroll.user_id", "users.id")
      .select("payroll.*", "users.name as user_name", "users.employee_id", "users.department")
      .where("payroll.id", req.params.id)
      .first();

    if (!record) return res.status(404).json({ success: false, error: "Payroll record not found" });

    if (!canViewAllPayroll(req.user.role) && record.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    res.json({ success: true, payroll: record });
  } catch (error) {
    next(error);
  }
};

const deletePayroll = async (req, res, next) => {
  try {
    if (!canManagePayroll(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const deleted = await db("payroll").where("id", req.params.id).del();
    if (!deleted) return res.status(404).json({ success: false, error: "Payroll record not found" });

    await logActivity(req.user.id, "delete", "payroll", req.params.id, {}, req.ip);
    res.json({ success: true, message: "Payroll record deleted" });
  } catch (error) {
    next(error);
  }
};

export { processPayroll, listPayroll, getPayroll, deletePayroll };
