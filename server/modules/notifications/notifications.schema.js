import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  audienceRoles: z.array(z.string()).optional(),
  audienceDepartments: z.array(z.string()).optional(),
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
