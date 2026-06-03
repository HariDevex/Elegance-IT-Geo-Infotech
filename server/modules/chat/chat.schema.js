import { z } from "zod";

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

export const chatQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
