import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/auth.js";
import { getDocuments, uploadDocument, deleteDocument } from "../controller/documentController.js";
import { generateSignedUploadUrl } from "../utils/supabaseStorage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|jpeg|jpg|png/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only PDF, DOC, DOCX, JPEG, JPG, PNG files allowed"));
  },
});

const router = express.Router();

router.use(authMiddleware);

router.get("/", getDocuments);
router.get("/:userId", getDocuments);

router.post("/", upload.single("file"), uploadDocument);

router.post("/signed-url", async (req, res, next) => {
  try {
    const { fileName, folder } = req.body;
    if (!fileName) {
      return res.status(400).json({ success: false, error: "fileName is required" });
    }
    const result = await generateSignedUploadUrl(fileName, folder);
    if (!result) {
      return res.status(400).json({ success: false, error: "Signed URL generation not available; use direct upload instead" });
    }
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", deleteDocument);

export default router;
