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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || 
        file.mimetype === "application/pdf" ||
        file.mimetype.includes("word") ||
        file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
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
