import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidUrl,
  isValidPassword,
  isValidPin,
  isValidProfileName,
  sanitizeString,
  isValidJson
} from './validation';

describe('isValidEmail', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@example.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user@.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('should validate correct URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('https://example.com/path')).toBe(true);
    expect(isValidUrl('https://example.com:8080')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidUrl('invalid')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false); // Missing protocol
  });
});

describe('isValidPassword', () => {
  it('should validate strong passwords', () => {
    expect(isValidPassword('Password123')).toBe(true);
    expect(isValidPassword('MyP@ssw0rd')).toBe(true);
    expect(isValidPassword('Abcd1234')).toBe(true);
  });

  it('should reject passwords without uppercase', () => {
    expect(isValidPassword('password123')).toBe(false);
  });

  it('should reject passwords without lowercase', () => {
    expect(isValidPassword('PASSWORD123')).toBe(false);
  });

  it('should reject passwords without numbers', () => {
    expect(isValidPassword('PasswordABC')).toBe(false);
  });

  it('should reject passwords shorter than 8 characters', () => {
    expect(isValidPassword('Pass1')).toBe(false);
    expect(isValidPassword('Pwd123')).toBe(false);
  });

  it('should reject empty password', () => {
    expect(isValidPassword('')).toBe(false);
  });
});

describe('isValidPin', () => {
  it('should validate 4-digit PINs', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('0000')).toBe(true);
    expect(isValidPin('9999')).toBe(true);
  });

  it('should validate 5-digit PINs', () => {
    expect(isValidPin('12345')).toBe(true);
  });

  it('should validate 6-digit PINs', () => {
    expect(isValidPin('123456')).toBe(true);
  });

  it('should reject PINs shorter than 4 digits', () => {
    expect(isValidPin('123')).toBe(false);
  });

  it('should reject PINs longer than 6 digits', () => {
    expect(isValidPin('1234567')).toBe(false);
  });

  it('should reject non-numeric PINs', () => {
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('abcd')).toBe(false);
  });

  it('should reject empty PIN', () => {
    expect(isValidPin('')).toBe(false);
  });
});

describe('isValidProfileName', () => {
  it('should validate alphanumeric names', () => {
    expect(isValidProfileName('John')).toBe(true);
    expect(isValidProfileName('User123')).toBe(true);
    expect(isValidProfileName('My Profile')).toBe(true);
  });

  it('should reject names with special characters', () => {
    expect(isValidProfileName('User@123')).toBe(false);
    expect(isValidProfileName('Name!')).toBe(false);
  });

  it('should reject names shorter than 1 character', () => {
    expect(isValidProfileName('')).toBe(false);
  });

  it('should reject names longer than 50 characters', () => {
    const longName = 'A'.repeat(51);
    expect(isValidProfileName(longName)).toBe(false);
  });

  it('should accept names exactly at limits', () => {
    expect(isValidProfileName('A')).toBe(true); // 1 char
    expect(isValidProfileName('A'.repeat(50))).toBe(true); // 50 chars
  });
});

describe('sanitizeString', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(sanitizeString('<p>Hello</p>')).toBe('Hello');
    expect(sanitizeString('<div>Test<span>Content</span></div>')).toBe('TestContent');
  });

  it('should preserve text without tags', () => {
    expect(sanitizeString('Plain text')).toBe('Plain text');
    expect(sanitizeString('No tags here')).toBe('No tags here');
  });

  it('should handle empty string', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('should handle self-closing tags', () => {
    expect(sanitizeString('Text <br/> More')).toBe('Text  More');
  });
});

describe('isValidJson', () => {
  it('should validate valid JSON strings', () => {
    expect(isValidJson('{}')).toBe(true);
    expect(isValidJson('{"key": "value"}')).toBe(true);
    expect(isValidJson('[]')).toBe(true);
    expect(isValidJson('[1, 2, 3]')).toBe(true);
    expect(isValidJson('null')).toBe(true);
    expect(isValidJson('true')).toBe(true);
    expect(isValidJson('123')).toBe(true);
  });

  it('should reject invalid JSON strings', () => {
    expect(isValidJson('invalid')).toBe(false);
    expect(isValidJson('{key: value}')).toBe(false); // Unquoted keys
    expect(isValidJson("{'key': 'value'}")).toBe(false); // Single quotes
    expect(isValidJson('{,}')).toBe(false);
    expect(isValidJson('')).toBe(false);
  });
});
