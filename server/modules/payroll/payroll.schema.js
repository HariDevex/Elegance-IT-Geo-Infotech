import { z } from "zod";

export const payrollSchema = z.object({
  employeeId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  basicSalary: z.number().positive(),
  allowances: z.record(z.number()).optional(),
  deductions: z.record(z.number()).optional(),
});

export const salarySlipSchema = z.object({
  employeeId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});
