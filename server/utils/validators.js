import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  role: z.enum(["developer", "teamlead", "manager", "hr", "admin"]).optional(),
  department: z.string().optional(),
  employeeId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email or Employee ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email or Employee ID is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  role: z.enum(["developer", "teamlead", "manager", "hr", "admin", "root"]),
  department: z.string().optional(),
  employeeId: z.string().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["developer", "teamlead", "manager", "hr", "admin", "root"]).optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const leaveRequestSchema = z.object({
  leaveType: z.enum(["Annual Leave", "Sick Leave", "Casual Leave", "unpaid"]),
  fromDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid from date",
  }),
  toDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid to date",
  }),
  description: z.string().max(500, "Description too long").optional(),
});

export const leaveStatusSchema = z.object({
  status: z.enum(["Approved", "Rejected", "Pending"]),
});

export const attendanceSchema = z.object({
  userId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  status: z.enum(["Present", "Absent", "Half Day", "Holiday", "Leave"]).optional(),
  action: z.enum(["checkin", "checkout"]).optional(),
});

export const checkinSchema = z.object({
  note: z.string().max(200).optional(),
});

export const checkoutSchema = z.object({
  note: z.string().max(200).optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(5000),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  targetRoles: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
});

export const notificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
  userId: z.string().uuid().optional(),
});

export const holidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required").max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  description: z.string().max(200).optional(),
});

export const chatMessageSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  type: z.enum(["direct", "group"]),
  text: z.string().min(1, "Message cannot be empty").max(5000),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(50),
  description: z.string().max(200).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const filterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.string().uuid().optional(),
});


