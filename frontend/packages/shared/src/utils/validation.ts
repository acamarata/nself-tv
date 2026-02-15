/**
 * Validate email address format
 *
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate password strength
 *
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 *
 * @param password - Password to validate
 * @returns True if password meets requirements
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

/**
 * Validate numeric PIN (4-6 digits)
 *
 * @param pin - PIN to validate
 * @returns True if valid PIN format
 */
export function isValidPin(pin: string): boolean {
  const pinRegex = /^\d{4,6}$/;
  return pinRegex.test(pin);
}

/**
 * Validate profile name
 *
 * Requirements:
 * - 1-50 characters
 * - Alphanumeric and spaces only
 *
 * @param name - Profile name to validate
 * @returns True if valid profile name
 */
export function isValidProfileName(name: string): boolean {
  if (name.length < 1 || name.length > 50) return false;
  const nameRegex = /^[a-zA-Z0-9 ]+$/;
  return nameRegex.test(name);
}

/**
 * Sanitize string for safe display (remove HTML tags)
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Validate JSON string
 *
 * @param jsonString - JSON string to validate
 * @returns True if valid JSON
 */
export function isValidJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}
