import { z } from "zod";

export const loginSchema = z.object({
  employee_id: z.string().min(1, "Employee ID is required").max(50),
  password: z.string().min(1, "Password is required").max(128),
  rememberMe: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const forgotPasswordSchema = z.object({
  employee_id: z.string().min(1, "Employee ID is required").max(50),
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

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});
