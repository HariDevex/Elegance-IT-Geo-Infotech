import express from "express";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import {
  createAnnouncement,
  listAnnouncements,
  deleteAnnouncement,
} from "../controller/announcementController.js";
import { validate } from "../middleware/validate.js";
import { sanitizeInput } from "../middleware/validator.js";
import { announcementSchema } from "../modules/notifications/notifications.schema.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireRole(ROLES.ROOT, ROLES.ADMIN), sanitizeInput, validate(announcementSchema), createAnnouncement);

router.get("/", listAnnouncements);

router.delete("/:id", deleteAnnouncement);

export default router;
