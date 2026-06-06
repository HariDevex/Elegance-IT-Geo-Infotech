import express from "express";
import authMiddleware from "../middleware/auth.js";
import { getMessages, sendMessage, createGroup, listGroups, deleteGroup } from "../controller/chatController.js";
import { validate } from "../middleware/validate.js";
import { sanitizeInput } from "../middleware/validator.js";
import { chatMessageSchema, createGroupSchema } from "../modules/chat/chat.schema.js";
import multer from "multer";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Allow images, audio, video, and common document types
    const allowedMimeTypes = [
      "image/",
      "audio/",
      "video/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/zip",
      "application/x-zip-compressed",
      "text/plain"
    ];

    if (allowedMimeTypes.some(type => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  }
});

router.use(authMiddleware);

router.get("/groups", listGroups);
router.post("/groups", sanitizeInput, validate(createGroupSchema), createGroup);
router.delete("/groups/:id", deleteGroup);

router.get("/", getMessages);
router.post("/", upload.single("file"), validate(chatMessageSchema), sendMessage);

export default router;
