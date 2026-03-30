import bcrypt from "bcryptjs";
import db from "../config/database.js";
import { uploadFile, deleteFile } from "../utils/supabaseStorage.js";
import { logActivity } from "./activityLogController.js";

const ROLES_HIERARCHY = ["root", "admin", "manager", "teamlead", "hr", "developer"];

const canManageRole = (currentRole, targetRole) => {
  const currentIndex = ROLES_HIERARCHY.indexOf(currentRole);
  const targetIndex = ROLES_HIERARCHY.indexOf(targetRole);
  return currentIndex <= targetIndex;
};

const createEmployee = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = "developer",
      dob,
      gender,
      maritalStatus,
      designation,
      department,
      salary,
      branch,
    } = req.body;

    if (salary && (isNaN(salary) || parseFloat(salary) < 0)) {
      return res.status(400).json({
        success: false,
        error: "Salary must be a positive number",
      });
    }

    // Validate and format DOB
    let formattedDob = null;
    if (dob) {
      const dobDate = new Date(dob + 'T00:00:00.000Z'); // Treat as UTC date
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid date of birth format",
        });
      }
      // Store as YYYY-MM-DD format
      formattedDob = dobDate.toISOString().split('T')[0];
    }

    // Check permission to create this role
    if (req.user.role !== "root" && !canManageRole(req.user.role, role)) {
      return res.status(403).json({
        success: false,
          error: "Not authorized to create this role",
        });
      }

    // Check if email exists
    if (email) {
      const existing = await db("users").where("email", email.toLowerCase()).first();
      if (existing) {
        return res.status(409).json({
          success: false,
          error: "Email already exists",
        });
      }
    }

    // Employee ID generation: Prefix + Year + Random 3-digit Number (10 chars total)
    // Example: EJB2026001, EJK2026002
    const BRANCH_CONFIG = {
      bengaluru: { prefix: "EJB" },
      krishnagiri: { prefix: "EJK" },
    };
    
    let finalEmployeeId;
    let branchDepartment = department || "";
    
    const branchKey = branch ? branch.toLowerCase() : null;
    const branchInfo = branchKey && BRANCH_CONFIG[branchKey] ? BRANCH_CONFIG[branchKey] : null;
    const prefix = branchInfo ? branchInfo.prefix : "EJB";
    const year = new Date().getFullYear();
    
    // Generate random 3-digit number
    const randomNum = Math.floor(Math.random() * 900) + 100;
    finalEmployeeId = `${prefix}${year}${randomNum}`;
    
    // Ensure uniqueness
    let exists = await db("users").where("employee_id", finalEmployeeId).first();
    let attempts = 0;
    while (exists && attempts < 10) {
      const newRandom = Math.floor(Math.random() * 900) + 100;
      finalEmployeeId = `${prefix}${year}${newRandom}`;
      exists = await db("users").where("employee_id", finalEmployeeId).first();
      attempts++;
    }
    
    if (branch && !department) {
      branchDepartment = branch.charAt(0).toUpperCase() + branch.slice(1);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const profileImage = req.file ? await uploadFile(req.file, "profiles") : null;

    const [user] = await db("users")
      .insert({
        name,
        email: email ? email.toLowerCase() : null,
        password: hashedPassword,
        role,
        employee_id: finalEmployeeId,
        dob: formattedDob,
        gender: gender || null,
        marital_status: maritalStatus || null,
        designation: designation || null,
        department: branchDepartment || null,
        salary: salary ? parseFloat(salary) : null,
        profile_image: profileImage,
      })
      .returning([
        "id",
        "name",
        "email",
        "role",
        "employee_id",
        "department",
        "designation",
        "profile_image",
        "created_at",
      ]);

    res.status(201).json({
      success: true,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        department: user.department,
        designation: user.designation,
        profileImage: user.profile_image,
        createdAt: user.created_at,
      },
    });
    
    await logActivity(req.user._id, "create", "employee", user.id, { name: user.name, role: user.role }, req.ip);
  } catch (error) {
    next(error);
  }
};

const listEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, department, role } = req.query;
    const offset = (page - 1) * limit;

    const allowedRoles = ["root", "admin", "manager", "hr"];
    const canViewAll = allowedRoles.includes(req.user.role);
    
    const whereConditions = [];
    
    if (search) {
      whereConditions.push({ type: "search", value: search });
    }
    if (department) {
      whereConditions.push({ type: "department", value: department });
    }
    if (role) {
      whereConditions.push({ type: "role", value: role });
    }
    if (!canViewAll) {
      whereConditions.push({ type: "user_id", value: req.user._id });
    }

    const buildQuery = (q) => {
      if (!canViewAll) {
        q = q.where("employee_id", req.user._id);
      }
      if (search) {
        const searchTerm = `%${search}%`;
        q = q.where((builder) => {
          builder
            .where("name", "like", searchTerm)
            .orWhere("email", "like", searchTerm)
            .orWhere("employee_id", "like", searchTerm);
        });
      }
      if (department) {
        q = q.where("department", department);
      }
      if (role) {
        q = q.where("role", role);
      }
      return q;
    };

    const countResult = await buildQuery(db("users")).count("* as count");
    const count = countResult[0]?.count || 0;

    const users = await buildQuery(
      db("users")
        .select(
          "employee_id",
          "name",
          "email",
          "role",
          "employee_id",
          "dob",
          "gender",
          "marital_status",
          "department",
          "designation",
          "salary",
          "profile_image",
          "avatar",
          "attendance_status",
          "created_at"
        )
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
    );

    const canViewSalary = ["root", "admin", "manager"].includes(req.user.role);

    res.json({
      success: true,
      users: users.map((u) => ({
        _id: u.employee_id,
        name: u.name,
        email: u.email,
        role: u.role,
        employeeId: u.employee_id,
        dob: u.dob,
        gender: u.gender,
        maritalStatus: u.marital_status,
        department: u.department,
        designation: u.designation,
        salary: canViewSalary ? u.salary : undefined,
        profileImage: u.profile_image,
        avatar: u.avatar,
        attendanceStatus: u.attendance_status,
        createdAt: u.created_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updates.password;
    delete updates._id;
    delete updates.id;

    // Validate salary
    if (updates.salary !== undefined && updates.salary !== "") {
      if (isNaN(updates.salary) || parseFloat(updates.salary) < 0) {
        return res.status(400).json({
          success: false,
          error: "Salary must be a positive number",
        });
      }
      updates.salary = parseFloat(updates.salary);
    }

    // Validate and format DOB
    if (updates.dob) {
      const dobDate = new Date(updates.dob + 'T00:00:00.000Z'); // Treat as UTC date
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid date of birth format",
        });
      }
      // Store as YYYY-MM-DD format
      updates.dob = dobDate.toISOString().split('T')[0];
    }

    // Handle password update separately
    if (updates.newPassword) {
      updates.password = await bcrypt.hash(updates.newPassword, 12);
      delete updates.newPassword;
    }

    // Handle role update permission
    if (updates.role && req.user.role !== "root") {
      if (!canManageRole(req.user.role, updates.role)) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to set this role",
        });
      }
    }

    // Handle file upload
    if (req.file) {
      const oldImage = await db("users").where("employee_id", id).first();
      if (oldImage?.profile_image) {
        await deleteFile(oldImage.profile_image);
      }
      updates.profile_image = await uploadFile(req.file, "profiles");
    }

    // Map camelCase to snake_case
    const mapping = {
      employeeId: "employee_id",
      maritalStatus: "marital_status",
      profileImage: "profile_image",
      attendanceStatus: "attendance_status",
    };

    for (const [key, value] of Object.entries(updates)) {
      if (mapping[key]) {
        updates[mapping[key]] = value;
        delete updates[key];
      }
    }

    updates.updated_at = db.fn.now();

    const [user] = await db("users")
      .where("id", id)
      .update(updates)
      .returning([
        "id",
        "name",
        "email",
        "role",
        "employee_id",
        "dob",
        "gender",
        "marital_status",
        "department",
        "designation",
        "salary",
        "profile_image",
        "avatar",
        "attendance_status",
      ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        dob: user.dob,
        gender: user.gender,
        maritalStatus: user.marital_status,
        department: user.department,
        designation: user.designation,
        salary: user.salary,
        profileImage: user.profile_image,
        avatar: user.avatar,
        attendanceStatus: user.attendance_status,
      },
    });
    
    await logActivity(req.user._id, "update", "employee", id, { name: user.name }, req.ip);
  } catch (error) {
    next(error);
  }
};

const updateAttendance = async (req, res, next) => {
  try {
    const allowedRoles = ["root", "admin", "manager"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "Present", "Absent"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
      });
    }

    const [user] = await db("users")
      .where("id", id)
      .update({
        attendance_status: status,
        updated_at: db.fn.now(),
      })
      .returning(["id", "name", "attendance_status"]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        _id: user.id,
        name: user.name,
        attendanceStatus: user.attendance_status,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.user._id) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete your own account",
      });
    }

    const deleted = await db("users").where("employee_id", id).del();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    await logActivity(req.user._id, "delete", "employee", id, {}, req.ip);

    res.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await db("users")
      .where("id", id)
      .select(
        "id",
        "name",
        "email",
        "role",
        "employee_id",
        "dob",
        "gender",
        "marital_status",
        "department",
        "designation",
        "salary",
        "profile_image",
        "avatar",
        "attendance_status",
        "created_at"
      )
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    const canViewSalary = ["root", "admin", "manager"].includes(req.user?.role);

    res.json({
      success: true,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        dob: user.dob,
        gender: user.gender,
        maritalStatus: user.marital_status,
        department: user.department,
        designation: user.designation,
        salary: canViewSalary ? user.salary : undefined,
        profileImage: user.profile_image,
        avatar: user.avatar,
        attendanceStatus: user.attendance_status,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  updateAttendance,
  deleteEmployee,
};
