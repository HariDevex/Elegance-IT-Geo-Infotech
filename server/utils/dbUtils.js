import db from "../config/database.js";

/**
 * Resolves a user ID that could be either a UUID or a human-readable employee_id.
 * 
 * @param {string} id - The ID to resolve
 * @returns {Promise<string|null>} - The database UUID or null if not found
 */
export const resolveUserId = async (id) => {
  if (!id) return null;
  
  // Basic UUID v4 regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(id)) {
    return id;
  }
  
  // If not a UUID, treat it as an employee_id and look up the UUID
  const user = await db("users")
    .where("employee_id", id)
    .where("is_deleted", false)
    .select("id")
    .first();
    
  return user ? user.id : null;
};
