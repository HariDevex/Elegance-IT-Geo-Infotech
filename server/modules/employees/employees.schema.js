import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.union([z.string().email("Invalid email address"), z.literal(""), z.null()]).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "manager", "teamlead", "developer", "hr", "root"]).optional().default("developer"),
  designation: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  branch: z.string().max(100).optional().nullable(),
  phone: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  salary: z.any().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  profileImage: z.any().optional(),
}).passthrough();

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).optional().nullable(),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  role: z.enum(["root", "admin", "manager", "teamlead", "developer", "hr"]).optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  salary: z.any().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional().nullable(),
  branch: z.string().optional().nullable(),
}).passthrough();

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
