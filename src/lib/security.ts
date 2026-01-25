import { z } from "zod";

// ============================================
// SECURITY UTILITIES FOR INPUT VALIDATION
// ============================================

// SQL Injection Detection Patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/i,
  /(\b(UNION|JOIN)\s+(ALL\s+)?SELECT\b)/i,
  /(-{2}|\/\*|\*\/|;)/,  // SQL comments and statement terminators
  /(\bOR\b\s+\d+\s*=\s*\d+)/i,  // OR 1=1 pattern
  /(\bAND\b\s+\d+\s*=\s*\d+)/i, // AND 1=1 pattern
  /(\'|\"|`)\s*(OR|AND)\s*(\'|\"|`)/i, // Quote-based injection
];

// XSS Detection Patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=, onerror=
  /<img[^>]+onerror/gi,
  /data:\s*text\/html/gi,
];

// Prompt Injection Patterns (for AI inputs)
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior\s+instructions/i,
  /forget\s+(everything|all)/i,
  /you\s+are\s+now\s+(a|an)/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<SYS>>/i,
];

/**
 * Detect SQL injection attempts in input
 */
export function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Detect XSS attempts in input
 */
export function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(input: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitize string input - removes dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize HTML content for safe display
 */
export function sanitizeForHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
  const trimmed = email.toLowerCase().trim();
  
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, sanitized: '', error: 'Invalid email format' };
  }
  
  // Length check
  if (trimmed.length > 255) {
    return { valid: false, sanitized: '', error: 'Email too long' };
  }
  
  // Check for dangerous patterns
  if (detectSQLInjection(trimmed) || detectXSS(trimmed)) {
    return { valid: false, sanitized: '', error: 'Invalid characters in email' };
  }
  
  return { valid: true, sanitized: trimmed };
}

// ============================================
// ZOD SCHEMAS FOR FORM VALIDATION
// ============================================

// Contact form schema with comprehensive validation
export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .refine(val => !detectSQLInjection(val), "Invalid characters detected")
    .refine(val => !detectXSS(val), "Invalid characters detected"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .refine(val => !detectSQLInjection(val), "Invalid characters detected"),
  institution: z
    .string()
    .trim()
    .max(200, "Institution must be less than 200 characters")
    .optional()
    .refine(val => !val || !detectSQLInjection(val), "Invalid characters detected")
    .refine(val => !val || !detectXSS(val), "Invalid characters detected"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters")
    .refine(val => !detectSQLInjection(val), "Invalid characters detected")
    .refine(val => !detectXSS(val), "Invalid characters detected"),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// File upload validation
export const fileUploadSchema = z.object({
  file: z.custom<File>()
    .refine(file => file instanceof File, "Invalid file")
    .refine(file => file.size <= 50 * 1024 * 1024, "File must be less than 50MB")
    .refine(
      file => {
        const allowedTypes = [
          'application/dicom',
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/octet-stream', // DICOM files sometimes have this type
        ];
        const allowedExtensions = ['.dcm', '.dicom', '.jpg', '.jpeg', '.png', '.webp'];
        const hasValidType = allowedTypes.includes(file.type) || file.type === '';
        const hasValidExtension = allowedExtensions.some(ext => 
          file.name.toLowerCase().endsWith(ext)
        );
        return hasValidType || hasValidExtension;
      },
      "Invalid file type. Allowed: DICOM, JPEG, PNG, WebP"
    ),
});

// Study ID validation
export const studyIdSchema = z
  .string()
  .uuid("Invalid study ID format")
  .refine(val => !detectSQLInjection(val), "Invalid characters");

// Search query validation
export const searchQuerySchema = z
  .string()
  .trim()
  .max(200, "Search query too long")
  .refine(val => !detectSQLInjection(val), "Invalid characters detected")
  .refine(val => !detectXSS(val), "Invalid characters detected");

// ============================================
// RATE LIMITING (Client-side tracking)
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string, 
  maxRequests: number, 
  windowMs: number
): { allowed: boolean; remainingRequests: number; resetInMs: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now >= entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remainingRequests: maxRequests - 1, resetInMs: windowMs };
  }
  
  if (entry.count >= maxRequests) {
    return { 
      allowed: false, 
      remainingRequests: 0, 
      resetInMs: entry.resetTime - now 
    };
  }
  
  entry.count++;
  return { 
    allowed: true, 
    remainingRequests: maxRequests - entry.count, 
    resetInMs: entry.resetTime - now 
  };
}

// ============================================
// SECURITY HEADERS HELPER
// ============================================

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ============================================
// LOGGING UTILITIES (Security events only)
// ============================================

export function logSecurityEvent(
  eventType: 'sql_injection' | 'xss_attempt' | 'rate_limit' | 'validation_failure',
  details: Record<string, unknown>
): void {
  // In production, this would send to a security monitoring service
  // For now, we log to console with sanitized data
  const sanitizedDetails = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      typeof value === 'string' ? sanitizeForHTML(value.substring(0, 100)) : value
    ])
  );
  
  console.warn(`[SECURITY] ${eventType}:`, {
    timestamp: new Date().toISOString(),
    ...sanitizedDetails
  });
}
