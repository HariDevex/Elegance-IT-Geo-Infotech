import bcrypt from "bcryptjs";
import knex from "knex";
import knexConfig from "../knexfile.js";
import dotenv from "dotenv";

dotenv.config();

export async function seed(knex) {
  console.log("🌱 Starting database seed...");

  try {
    const existingRoot = await knex("users").where("role", "root").first();
    if (existingRoot) {
      console.log("⚠️  Root user already exists. Skipping seed.");
      return;
    }

    const generateEmployeeId = () => {
      const prefix = "EJB";
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 900) + 100;
      return `${prefix}${year}${randomNum}`;
    };

    const newEmployeeId = generateEmployeeId();

    const hashedPassword = await bcrypt.hash(newEmployeeId, 12);

    const [rootUser] = await knex("users")
      .insert({
        name: process.env.DEFAULT_NAME || "Admin",
        email: process.env.DEFAULT_EMAIL || "admin@elegance.com",
        password: hashedPassword,
        role: "root",
        employee_id: newEmployeeId,
        department: "Administration",
        designation: "System Administrator",
      })
      .returning("*");

    console.log(`✅ Root user created:`);
    console.log(`   Employee ID: ${rootUser.employee_id}`);
    console.log(`   Password: ${rootUser.employee_id}`);
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
