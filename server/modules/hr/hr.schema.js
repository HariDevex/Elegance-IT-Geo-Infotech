import { z } from "zod";

export const resignationSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(1000),
  lastWorkingDay: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date",
  }),
  comments: z.string().max(2000).optional(),
});

export const resignationStatusSchema = z.object({
  status: z.enum(["Approved", "Rejected", "Pending"]),
  adminComment: z.string().max(500).optional(),
});

export const onboardingSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  joiningDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid joining date",
  }),
  documents: z.array(z.any()).optional(),
});
