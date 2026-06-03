import { z } from "zod";

export const leaveRequestSchema = z.object({
  type: z.enum(["Annual Leave", "Sick Leave", "Casual Leave", "unpaid"]),
  from: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid from date",
  }),
  to: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid to date",
  }),
  description: z.string().max(500, "Description too long").optional(),
});

export const leaveStatusSchema = z.object({
  status: z.enum(["Approved", "Rejected", "Pending"]),
  adminComment: z.string().max(500).optional(),
});

export const leaveBalanceSchema = z.object({
  userId: z.string().uuid().optional(),
});
