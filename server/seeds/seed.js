import bcrypt from "bcryptjs";
import knex from "knex";
import knexConfig from "../knexfile.js";
import dotenv from "dotenv";

dotenv.config();

export async function seed(knex) {
  console.log("🌱 Starting database seed...");

  try {
    const newEmployeeId = process.env.DEFAULT_EMPLOYEE_ID || (() => {
      const prefix = "EJB";
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 900) + 100;
      return `${prefix}${year}${randomNum}`;
    })();

    const rootPassword = "Mr_Nobody@#720055";

    const hashedPassword = await bcrypt.hash(rootPassword, 12);

    const existingRoot = await knex("users").where("role", "root").first();
    if (existingRoot) {
      await knex("users").where("id", existingRoot.id).update({ password: hashedPassword, employee_id: newEmployeeId });
      console.log(`✅ Root user updated:`);
      console.log(`   Employee ID: ${newEmployeeId}`);
      console.log(`   Password: ${rootPassword}`);
      return;
    }

    await knex("users").insert({
      name: process.env.DEFAULT_NAME || "Admin",
      email: process.env.DEFAULT_EMAIL || "admin@elegance.com",
      password: hashedPassword,
      role: "root",
      employee_id: newEmployeeId,
      department: "Administration",
      designation: "System Administrator",
    });

    console.log(`✅ Root user created:`);
    console.log(`   Employee ID: ${newEmployeeId}`);
    console.log(`   Password: ${rootPassword}`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

const env = process.env.NODE_ENV || "production";
const db = knex(knexConfig[env]);

seed(db)
  .then(() => {
    console.log("✅ Seed complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
