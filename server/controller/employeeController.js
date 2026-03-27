import bcrypt from "bcryptjs";
import db from "../config/database.js";
import { uploadFile, deleteFile } from "../utils/supabaseStorage.js";

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
      employeeId,
      dob,
      gender,
      maritalStatus,
      designation,
      department,
      salary,
    } = req.body;

    if (salary && (isNaN(salary) || parseFloat(salary) < 0)) {
      return res.status(400).json({
        success: false,
        error: "Salary must be a positive number",
      });
    }

    // Check permission to create this role
    if (req.user.role !== "root" && !canManageRole(req.user.role, role)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to create this role",
      });
    }

    // Check if email exists
    const existing = await db("users").where("email", email.toLowerCase()).first();
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Email already exists",
      });
    }

    // Check employee ID uniqueness - auto-generate if not provided
    let finalEmployeeId = employeeId;
    if (!finalEmployeeId) {
      const lastUser = await db("users")
        .whereNotNull("employee_id")
        .where("employee_id", "like", "EMP%")
        .orderBy("employee_id", "desc")
        .first();
      
      if (lastUser && lastUser.employee_id) {
        const num = parseInt(lastUser.employee_id.replace("EMP", "")) + 1;
        finalEmployeeId = `EMP${num.toString().padStart(3, "0")}`;
      } else {
        finalEmployeeId = "EMP001";
      }
    } else {
      const existingId = await db("users").where("employee_id", employeeId).first();
      if (existingId) {
        return res.status(409).json({
          success: false,
          error: "Employee ID already exists",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const profileImage = req.file ? await uploadFile(req.file, "profiles") : null;

    const [user] = await db("users")
      .insert({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        employee_id: finalEmployeeId,
        dob: dob || null,
        gender: gender || null,
        marital_status: maritalStatus || null,
        designation: designation || null,
        department: department || null,
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
  } catch (error) {
    next(error);
  }
};

const listEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, department, role } = req.query;
    const offset = (page - 1) * limit;

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

    const buildQuery = (q) => {
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
          "id",
          "name",
          "email",
          "role",
          "employee_id",
          "dob",
          "gender",
          "department",
          "designation",
          "profile_image",
          "attendance_status",
          "created_at"
        )
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
    );

    res.json({
      success: true,
      users: users.map((u) => ({
        _id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        employeeId: u.employee_id,
        dob: u.dob,
        gender: u.gender,
        department: u.department,
        designation: u.designation,
        profileImage: u.profile_image,
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
      const oldImage = await db("users").where("id", id).first();
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

    const deleted = await db("users").where("id", id).del();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

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
