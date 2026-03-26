import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const uploadFile = async (file, folder = "uploads") => {
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
    console.error("Supabase upload error:", error);
    throw error;
  }
};

export const deleteFile = async (fileUrl) => {
  try {
    const fileName = fileUrl.split("/storage/v1/object/public/ems-uploads/")[1];
    if (!fileName) return;

    const { error } = await supabase.storage
      .from("ems-uploads")
      .remove([fileName]);

    if (error) throw error;
  } catch (error) {
    console.error("Supabase delete error:", error);
  }
};
