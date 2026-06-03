import db from "../config/database.js";
import { uploadFile, deleteFile } from "../utils/supabaseStorage.js";

const ALLOWED_TYPES = ["contract", "id_proof", "certificate", "other"];

const getDocuments = async (req, res, next) => {
  try {
    let userId = req.user.id;

    if (req.params.userId) {
      if (!["root", "admin", "manager", "teamlead", "hr"].includes(req.user.role)) {
        return res.status(403).json({ success: false, error: "Not authorized" });
      }
      const user = await db("users").where("employee_id", req.params.userId).select("id").first();
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      userId = user.id;
    }

    const { folder_id } = req.query;
    let query = db("documents")
      .where("user_id", userId)
      .orderBy("created_at", "desc");

    if (folder_id === "null" || folder_id === "") {
      query = query.whereNull("folder_id");
    } else if (folder_id) {
      query = query.where("folder_id", folder_id);
    }

    const documents = await query;

    res.json({
      success: true,
      documents: documents.map(d => ({
        _id: d.id,
        name: d.name,
        type: d.type,
        fileUrl: d.file_url,
        description: d.description,
        folder_id: d.folder_id,
        createdAt: d.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const userId = req.user.id;
    const { name, type = "other", description, folder_id } = req.body;

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: "Invalid document type" });
    }

    const fileUrl = await uploadFile(req.file, "documents");

    const [document] = await db("documents")
      .insert({
        user_id: userId,
        name: name || req.file.originalname,
        type,
        file_url: fileUrl,
        description,
        folder_id: folder_id || null,
      })
      .returning("*");

    res.status(201).json({
      success: true,
      document: {
        _id: document.id,
        name: document.name,
        type: document.type,
        fileUrl: document.file_url,
        description: document.description,
        folder_id: document.folder_id,
        createdAt: document.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const doc = await db("documents").where("id", id).first();

    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    if (doc.user_id !== userId && !["root", "admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    if (doc.file_url) {
      await deleteFile(doc.file_url);
    }

    await db("documents").where("id", id).del();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export { getDocuments, uploadDocument, deleteDocument, ALLOWED_TYPES };
