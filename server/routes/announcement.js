import express from "express";
import authMiddleware, { requireRole, ROLES } from "../middleware/auth.js";
import {
  createAnnouncement,
  listAnnouncements,
  deleteAnnouncement,
} from "../controller/announcementController.js";
import { validate, sanitizeInput } from "../middleware/validator.js";

const router = express.Router();

const createAnnouncementSchema = {
  title: { required: true, minLength: 3, maxLength: 200 },
  message: { required: true, minLength: 10, maxLength: 5000 },
  priority: { enum: ["low", "medium", "high"], maxLength: 20 },
};

router.use(authMiddleware);

router.post("/", requireRole(ROLES.ROOT, ROLES.ADMIN), sanitizeInput, validate(createAnnouncementSchema), createAnnouncement);

router.get("/", listAnnouncements);

router.delete("/:id", deleteAnnouncement);

export default router;
