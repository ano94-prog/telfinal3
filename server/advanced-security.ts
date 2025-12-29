/**
 * Advanced Security Module
 * Multi-layered bot and spam protection for form submissions
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ============================================
// 1. RATE LIMITING
// ============================================

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const rateLimits = new Map<string, RateLimitRecord>();

// List of localhost IPs to exempt from rate limiting
const LOCALHOST_IPS = [
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
  "localhost",
];

function isLocalhost(ip: string): boolean {
  return LOCALHOST_IPS.some(
    (local) => ip === local || ip.includes(local) || ip.startsWith("192.168.") || ip.startsWith("10.")
  );
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return (
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

/**
 * Rate limiting middleware
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimitMiddleware(maxRequests: number = 5, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);

    // Skip rate limiting for localhost
    if (isLocalhost(ip)) {
      return next();
    }

    const now = Date.now();
    const record = rateLimits.get(ip);

    // Clean up old records periodically
    if (rateLimits.size > 10000) {
      const cutoff = now - windowMs * 2;
      for (const [key, value] of rateLimits.entries()) {
        if (value.windowStart < cutoff) {
          rateLimits.delete(key);
        }
      }
    }

    // No existing record or expired window
    if (!record || now - record.windowStart > windowMs) {
      rateLimits.set(ip, { count: 1, windowStart: now });
      return next();
    }

    // Check if limit exceeded
    if (record.count >= maxRequests) {
      console.log(
        `[Security] Rate limit exceeded for IP: ${ip} | Requests: ${record.count}/${maxRequests}`
      );
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000),
      });
    }

    // Increment count
    record.count++;
    next();
  };
}

// ============================================
// 2. CSRF TOKEN VALIDATION
// ============================================

interface CSRFToken {
  ip: string;
  expiresAt: number;
  used: boolean;
}

const csrfTokens = new Map<string, CSRFToken>();

/**
 * Generate a CSRF token for the client
 */
export function generateCSRFToken(req: Request): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  csrfTokens.set(token, {
    ip: getClientIP(req),
    expiresAt,
    used: false,
  });

  // Cleanup old tokens
  if (csrfTokens.size > 10000) {
    const now = Date.now();
    for (const [key, value] of csrfTokens.entries()) {
      if (value.expiresAt < now || value.used) {
        csrfTokens.delete(key);
      }
    }
  }

  return { token, expiresAt };
}

/**
 * Validate CSRF token middleware
 */
export function validateCSRFToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-csrf-token"] as string || req.body._csrf;
  
  // Skip for localhost in development
  const ip = getClientIP(req);
  if (isLocalhost(ip)) {
    return next();
  }

  if (!token) {
    console.log(`[Security] Missing CSRF token from IP: ${ip}`);
    return res.status(403).json({
      success: false,
      message: "Security token required",
    });
  }

  const record = csrfTokens.get(token);

  if (!record) {
    console.log(`[Security] Invalid CSRF token from IP: ${ip}`);
    return res.status(403).json({
      success: false,
      message: "Invalid security token",
    });
  }

  if (record.expiresAt < Date.now()) {
    csrfTokens.delete(token);
    console.log(`[Security] Expired CSRF token from IP: ${ip}`);
    return res.status(403).json({
      success: false,
      message: "Security token expired. Please refresh and try again.",
    });
  }

  if (record.used) {
    console.log(`[Security] Reused CSRF token from IP: ${ip}`);
    return res.status(403).json({
      success: false,
      message: "Security token already used",
    });
  }

  // Mark as used (one-time use)
  record.used = true;
  next();
}

// ============================================
// 3. HONEYPOT VALIDATION
// ============================================

/**
 * Check common honeypot field names
 */
export function checkHoneypot(req: Request, res: Response, next: NextFunction) {
  const honeypotFields = [
    "website_url",
    "website",
    "url",
    "homepage",
    "fax",
    "company_website",
    "secondary_email",
  ];

  for (const field of honeypotFields) {
    if (req.body[field]) {
      console.log(
        `[Security] Honeypot triggered: ${field}="${req.body[field]}" | IP: ${getClientIP(req)} | UA: ${req.get("User-Agent")}`
      );
      // Return generic error to not reveal detection
      return res.status(400).json({
        success: false,
        message: "Invalid request",
      });
    }
  }

  next();
}

// ============================================
// 4. BEHAVIORAL ANALYSIS
// ============================================

interface BehavioralData {
  mouseMovements: number;
  keystrokes: number;
  timeOnForm: number;
  scrollEvents: number;
  focusChanges: number;
}

/**
 * Calculate a bot score based on behavioral data
 * Higher score = more likely human (0-100)
 */
export function calculateBotScore(behavioral: BehavioralData | undefined): number {
  if (!behavioral) {
    return 30; // No data is suspicious but not definitive
  }

  let score = 100;

  // Very few mouse movements
  if (behavioral.mouseMovements < 3) score -= 25;
  else if (behavioral.mouseMovements < 10) score -= 10;

  // Very few keystrokes (forms require typing)
  if (behavioral.keystrokes < 5) score -= 25;
  else if (behavioral.keystrokes < 15) score -= 10;

  // Form submitted too quickly (less than 2 seconds)
  if (behavioral.timeOnForm < 2000) score -= 35;
  else if (behavioral.timeOnForm < 5000) score -= 15;

  // No scroll events on longer forms
  if (behavioral.scrollEvents === 0) score -= 5;

  // No focus changes (tabbing through fields)
  if (behavioral.focusChanges === 0) score -= 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Behavioral analysis middleware
 */
export function analyzeBehavior(minScore: number = 40) {
  return (req: Request, res: Response, next: NextFunction) => {
    const behavioral = req.body._behavioral as BehavioralData | undefined;
    const ip = getClientIP(req);

    // Skip for localhost
    if (isLocalhost(ip)) {
      return next();
    }

    const score = calculateBotScore(behavioral);

    if (score < minScore) {
      console.log(
        `[Security] Low behavioral score: ${score}/${minScore} | IP: ${ip} | Data: ${JSON.stringify(behavioral)}`
      );
      // Don't block, but flag for review
      (req as any).suspiciousBehavior = true;
      (req as any).behaviorScore = score;
    }

    // Remove behavioral data from body before processing
    if (req.body._behavioral) {
      delete req.body._behavioral;
    }

    next();
  };
}

// ============================================
// 5. EMAIL VALIDATION
// ============================================

// Common disposable email domains
const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "throwaway.email",
  "fakeinbox.com",
  "maildrop.cc",
  "temp-mail.org",
  "getnada.com",
  "mohmal.com",
  "sharklasers.com",
  "guerrillamail.info",
  "grr.la",
  "pokemail.net",
  "spam4.me",
  "trashmail.com",
  "mailnesia.com",
  "mintemail.com",
  "tempail.com",
  "discard.email",
  "yopmail.com",
  "tempr.email",
  "dropmail.me",
  "throwawaymail.com",
  "tmpmail.org",
  "tmpmail.net",
  "emailondeck.com",
  "getairmail.com",
];

/**
 * Validate email address
 */
export function validateEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, reason: "Email is required" };
  }

  // Basic syntax check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: "Invalid email format" };
  }

  // Check for disposable domains
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, reason: "Invalid email domain" };
  }

  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, reason: "Disposable email addresses are not allowed" };
  }

  // Check for suspicious patterns
  if (domain.length > 50) {
    return { valid: false, reason: "Invalid email domain" };
  }

  // Check for multiple dots at end (e.g., test@example.com..)
  if (domain.endsWith(".") || domain.includes("..")) {
    return { valid: false, reason: "Invalid email format" };
  }

  return { valid: true };
}

/**
 * Email validation middleware
 */
export function validateEmailMiddleware(fieldName: string = "email") {
  return (req: Request, res: Response, next: NextFunction) => {
    const email = req.body[fieldName];

    // Skip if no email field
    if (!email) {
      return next();
    }

    const result = validateEmail(email);

    if (!result.valid) {
      console.log(
        `[Security] Email validation failed: ${result.reason} | Email: ${email} | IP: ${getClientIP(req)}`
      );
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }

    next();
  };
}

// ============================================
// 6. JAVASCRIPT DEPENDENCY CHECK
// ============================================

/**
 * Verify that JavaScript was executed (form nonce present)
 */
export function requireJavaScript(req: Request, res: Response, next: NextFunction) {
  const jsVerified = req.body._js_verified;
  const ip = getClientIP(req);

  // Skip for localhost
  if (isLocalhost(ip)) {
    return next();
  }

  if (!jsVerified) {
    console.log(
      `[Security] JS verification missing - possible headless bot | IP: ${ip} | UA: ${req.get("User-Agent")}`
    );
    return res.status(400).json({
      success: false,
      message: "Invalid submission",
    });
  }

  // Remove from body
  delete req.body._js_verified;
  next();
}

// ============================================
// 7. COMBINED SECURITY MIDDLEWARE
// ============================================

/**
 * Apply all security checks in sequence
 */
export function applyAllSecurity(options: {
  rateLimit?: { maxRequests?: number; windowMs?: number };
  requireCsrf?: boolean;
  checkBehavior?: boolean;
  minBehaviorScore?: number;
  validateEmails?: boolean;
  emailField?: string;
  requireJs?: boolean;
} = {}) {
  const middlewares: ((req: Request, res: Response, next: NextFunction) => void)[] = [];

  // 1. Rate limiting (always on, but localhost exempt)
  middlewares.push(
    rateLimitMiddleware(
      options.rateLimit?.maxRequests || 5,
      options.rateLimit?.windowMs || 60000
    )
  );

  // 2. Honeypot check (always on)
  middlewares.push(checkHoneypot);

  // 3. CSRF validation (optional, default off for backwards compatibility)
  if (options.requireCsrf) {
    middlewares.push(validateCSRFToken);
  }

  // 4. Behavioral analysis (optional)
  if (options.checkBehavior) {
    middlewares.push(analyzeBehavior(options.minBehaviorScore || 40));
  }

  // 5. Email validation (optional)
  if (options.validateEmails) {
    middlewares.push(validateEmailMiddleware(options.emailField || "email"));
  }

  // 6. JavaScript requirement (optional)
  if (options.requireJs) {
    middlewares.push(requireJavaScript);
  }

  // Return combined middleware
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;

    const runNext = (err?: any) => {
      if (err) return next(err);
      if (index >= middlewares.length) return next();

      const middleware = middlewares[index++];
      try {
        middleware(req, res, runNext);
      } catch (error) {
        next(error);
      }
    };

    runNext();
  };
}

// Export token generation endpoint handler
export function handleTokenRequest(req: Request, res: Response) {
  const { token, expiresAt } = generateCSRFToken(req);
  res.json({ token, expiresAt });
}
