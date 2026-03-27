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

const saveLocalFile = async (file) => {
  const fileName = `${Date.now()}-${file.originalname}`;
  const filePath = path.join(localUploadPath, fileName);
  
  fs.writeFileSync(filePath, file.buffer);
  return `/uploads/${fileName}`;
};

export const uploadFile = async (file, folder = "uploads") => {
  if (supabase) {
    try {
      const fileName = `${folder}/${Date.now()}-${file.originalname}`;
      
      const { data, error } = await supabase.storage
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