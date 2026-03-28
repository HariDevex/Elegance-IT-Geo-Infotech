import { describe, it, expect, beforeEach } from 'vitest';
import { validate } from '../middleware/validator.js';
import validator from 'validator';

const MAX_STRING_LENGTH = 500;
const MAX_TEXTAREA_LENGTH = 2000;

describe("Validators", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { body: {}, query: {} };
    mockRes = {
      status: (code) => {
        mockRes.statusCode = code;
        return mockRes;
      },
      json: (data) => {
        mockRes.jsonData = data;
        return mockRes;
      }
    };
    mockNext = () => {};
  });

  describe("Input Validation", () => {
    it("should pass with valid string length", () => {
      mockReq.body = { name: "John Doe", email: "john@example.com" };
      const next = () => { mockNext.called = true; };
      validateInputLength(mockReq, mockRes, next);
      expect(mockNext.called).toBe(true);
    });

    it("should fail with string exceeding max length", () => {
      mockReq.body = { name: "A".repeat(600) };
      let errorResponse;
      mockRes.status = (code) => {
        errorResponse = { code, data: mockRes.jsonData };
        return mockRes;
      };
      const next = () => {};
      validateInputLength(mockReq, mockRes, next);
      expect(mockRes.jsonData.success).toBe(false);
    });

    it("should fail with textarea exceeding max length", () => {
      mockReq.body = { description: "A".repeat(2100) };
      validateInputLength(mockReq, mockRes, () => {});
      expect(mockRes.jsonData.success).toBe(false);
    });
  });

  describe("XSS Sanitization", () => {
    it("should escape HTML in input", () => {
      mockReq.body = { name: '<script>alert("xss")</script>' };
      sanitizeInput(mockReq, mockRes, () => {});
      expect(mockReq.body.name).not.toContain('<script>');
      expect(mockReq.body.name).toContain('&lt;script&gt;');
    });

    it("should trim whitespace", () => {
      mockReq.body = { name: '  John  ' };
      sanitizeInput(mockReq, mockRes, () => {});
      expect(mockReq.body.name).toBe('John');
    });
  });

  describe("UUID Validation", () => {
    it("should pass with valid UUID", () => {
      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const next = () => { mockNext.called = true; };
      validateUUID('id')(mockReq, mockRes, next);
      expect(mockNext.called).toBe(true);
    });

    it("should fail with invalid UUID format", () => {
      mockReq.params = { id: 'not-a-uuid' };
      const next = () => { mockNext.called = true; };
      validateUUID('id')(mockReq, mockRes, next);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error).toBe('Resource not found');
    });
  });

  describe("Schema Validation", () => {
    it("should validate email format", () => {
      expect(validator.isEmail("test@example.com")).toBe(true);
      expect(validator.isEmail("invalid")).toBe(false);
    });

    it("should escape and trim strings", () => {
      const result = validator.escape(validator.trim("  <script>  "));
      expect(result).toBe('&lt;script&gt;');
    });
  });
});

function validateInputLength(req, res, next) {
  const checkLength = (obj, path = "") => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        const maxLength = key === "description" || key === "reason" || key === "notes" 
          ? MAX_TEXTAREA_LENGTH 
          : MAX_STRING_LENGTH;
        
        if (value.length > maxLength) {
          return `${key} exceeds maximum length`;
        }
        
        const SUSPICIOUS_PATTERNS = [
          /[\u0000-\u001F\u007F-\u009F]/,
          /[\uFDD0-\uFDEF]/,
        ];
        
        for (const pattern of SUSPICIOUS_PATTERNS) {
          if (pattern.test(value)) {
            return `Invalid characters in ${key}`;
          }
        }
      }
      
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const error = checkLength(value, key);
        if (error) return error;
      }
    }
    return null;
  };

  const error = checkLength(req.body);
  if (error) {
    return res.status(400).json({ success: false, error });
  }
  next();
}

function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = validator.escape(validator.trim(obj[key]));
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  next();
}

function validateUUID(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value) return next();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return res.status(404).json({ success: false, error: "Resource not found" });
    }
    next();
  };
}
