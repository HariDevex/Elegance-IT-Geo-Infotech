import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Supabase init error:", e);
  }
}

const localUploadPath = path.join(process.cwd(), "uploads");

const sanitizeFileName = (name) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const saveLocalFile = async (file) => {
  const sanitizedName = sanitizeFileName(file.originalname);
  const fileName = `${Date.now()}-${sanitizedName}`;
  const filePath = path.join(localUploadPath, fileName);
  
  fs.writeFileSync(filePath, file.buffer);
  return `/uploads/${fileName}`;
};

export const uploadFile = async (file, folder = "uploads") => {
  const sanitizedName = sanitizeFileName(file.originalname);
  
  if (supabase) {
    try {
      const fileName = `${folder}/${Date.now()}-${sanitizedName}`;
      
const { error } = await supabase.storage
        .from("ems-uploads")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("ems-uploads")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Supabase upload error:", error.message);
    }
  }

  return await saveLocalFile(file);
};

export const generateSignedUploadUrl = async (fileName, folder = "uploads") => {
  if (!supabase) {
    return null;
  }

  try {
    const filePath = `${folder}/${Date.now()}-${sanitizeFileName(fileName)}`;
    const { data, error } = await supabase.storage
      .from("ems-uploads")
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    return {
      signedUrl: data.signedUrl,
      path: filePath,
      publicUrl: supabase.storage.from("ems-uploads").getPublicUrl(filePath).data.publicUrl,
    };
  } catch (error) {
    console.error("Supabase signed URL error:", error.message);
    return null;
  }
};

export const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  if (supabase && fileUrl.includes("ems-uploads")) {
    try {
      const fileName = fileUrl.split("/storage/v1/object/public/ems-uploads/")[1];
      if (!fileName) return;

      await supabase.storage
        .from("ems-uploads")
        .remove([fileName]);
    } catch (error) {
      console.error("Supabase delete error:", error.message);
    }
  } else if (fileUrl.startsWith("/uploads/")) {
    const fileName = fileUrl.replace("/uploads/", "");
    const filePath = path.join(localUploadPath, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};