import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  role: z.enum(["admin", "manager", "teamlead", "developer", "hr"]),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  branch: z.string().max(100).optional(),
  phone: z.string().optional(),
  joiningDate: z.string().optional(),
  employeeId: z.string().optional(),
  profileImage: z.any().optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["root", "admin", "manager", "teamlead", "developer"]).optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  phone: z.string().optional(),
  joiningDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  branch: z.string().optional(),
});

export const attendanceUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  status: z.enum(["Present", "Absent", "Half Day", "Holiday", "Leave"]),
});

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
});
