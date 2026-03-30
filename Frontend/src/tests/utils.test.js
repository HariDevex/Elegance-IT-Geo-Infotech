import { describe, it, expect } from 'vitest';

describe('Form Validation', () => {
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  };

  describe('Email Validation', () => {
    it('should accept valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should accept strong password', () => {
      expect(validatePassword('SecurePass123!')).toBe(true);
      expect(validatePassword('MyP@ssw0rd')).toBe(true);
    });

    it('should reject weak password', () => {
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('nouppercase123!')).toBe(false);
      expect(validatePassword('NOLOWERCASE123!')).toBe(false);
      expect(validatePassword('NoSpecialChar123')).toBe(false);
    });
  });
});

describe('Date Utilities', () => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isValidDate = (dateStr) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  it('should format date correctly', () => {
    const formatted = formatDate('2024-03-15');
    expect(formatted).toContain('2024');
    expect(formatted).toContain('Mar');
    expect(formatted).toContain('15');
  });

  it('should validate correct date', () => {
    expect(isValidDate('2024-03-15')).toBe(true);
    expect(isValidDate('2024-12-31')).toBe(true);
  });

  it('should reject invalid date', () => {
    expect(isValidDate('invalid')).toBe(false);
    expect(isValidDate('2024-13-01')).toBe(false);
  });
});
