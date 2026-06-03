import { z } from "zod";

export const attendanceSchema = z.object({
  userId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  status: z.enum(["Present", "Absent", "Half Day", "Holiday", "Leave"]).optional(),
  action: z.enum(["checkin", "checkout"]).optional(),
});

export const attendanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.string().uuid().optional(),
  status: z.string().optional(),
});

export const checkinSchema = z.object({
  note: z.string().max(200).optional(),
});

export const checkoutSchema = z.object({
  note: z.string().max(200).optional(),
});

export const qrCheckinSchema = z.object({
  token: z.string().min(1, "QR token is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
