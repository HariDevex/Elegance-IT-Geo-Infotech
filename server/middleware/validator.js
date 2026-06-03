import validator from "validator";

const MAX_STRING_LENGTH = 500;
const MAX_TEXTAREA_LENGTH = 2000;
const SUSPICIOUS_PATTERNS = [
  /[\x00-\x1F\x7F-\x9F]/,
  /[\uFDD0-\uFDEF]/,
  /[\uFFFE-\uFFFF]/,
];

export const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null && value !== "") {
        if (rules.type === "email" && !validator.isEmail(value)) {
          errors.push(`${field} must be a valid email`);
        }

        if (rules.type === "password" && value.length < 6) {
          errors.push(`${field} must be at least 6 characters`);
        }

        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(", "),
      });
    }

    next();
  };
};

export const validateInputLength = (req, res, next) => {
  const checkLength = (obj, path = "") => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === "string") {
        const maxLength = key === "description" || key === "reason" || key === "notes" 
          ? MAX_TEXTAREA_LENGTH 
          : MAX_STRING_LENGTH;
        
        if (value.length > maxLength) {
          return `${currentPath} exceeds maximum length of ${maxLength} characters`;
        }
        
        for (const pattern of SUSPICIOUS_PATTERNS) {
          if (pattern.test(value)) {
            return `Invalid characters in ${currentPath}`;
          }
        }
      }
      
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const error = checkLength(value, currentPath);
        if (error) return error;
      }
    }
    return null;
  };

  if (!req.body || typeof req.body !== 'object') return next();
  const error = checkLength(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error,
    });
  }

  next();
};

export const validateUUID = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    
    if (!value) return next();
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(value)) {
      return res.status(404).json({
        success: false,
        error: "Resource not found",
      });
    }
    
    next();
  };
};

const PASSWORD_FIELDS = new Set(["password", "newPassword", "oldPassword", "confirmPassword"]);

export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        if (PASSWORD_FIELDS.has(key)) continue;
        obj[key] = validator.escape(validator.trim(obj[key]));
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};
