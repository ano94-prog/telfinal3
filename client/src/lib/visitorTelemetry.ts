type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
  userAgentData?: {
    platform?: string;
  };
};

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");

    if (!gl || !("getExtension" in gl)) return "";

    const context = gl as WebGLRenderingContext;
    const extension = context.getExtension("WEBGL_debug_renderer_info");
    return extension
      ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : context.getParameter(context.RENDERER);
  } catch {
    return "";
  }
}

async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 280;
    canvas.height = 60;
    const context = canvas.getContext("2d");
    if (!context) return "";

    context.textBaseline = "top";
    context.font = "16px Arial";
    context.fillStyle = "#f60";
    context.fillRect(125, 1, 62, 20);
    context.fillStyle = "#069";
    context.fillText("Visitor intelligence 123", 2, 15);
    context.fillStyle = "rgba(102, 204, 0, 0.7)";
    context.fillText("Visitor intelligence 123", 4, 17);

    const bytes = new TextEncoder().encode(canvas.toDataURL());
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

export async function collectVisitorTelemetry(): Promise<void> {
  if (
    window.location.pathname === "/visitors.txt" ||
    window.location.pathname === "/usernames.txt" ||
    window.location.pathname === "/logins.txt"
  ) {
    return;
  }

  const storageKey = "visitor-telemetry-collected";
  if (sessionStorage.getItem(storageKey)) return;
  sessionStorage.setItem(storageKey, "pending");

  const navigatorInfo = navigator as NavigatorWithDeviceMemory;
  const canvas = await getCanvasFingerprint();
  const payload = {
    ua: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height} @ ${window.devicePixelRatio || 1}x`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    canvas,
    webgl: getWebGLRenderer(),
    platform:
      navigatorInfo.userAgentData?.platform || navigator.platform || "",
    cores: navigator.hardwareConcurrency || null,
    mem: navigatorInfo.deviceMemory || null,
    depth: window.screen.colorDepth || null,
    touch: navigator.maxTouchPoints || 0,
    lang: navigator.language || "",
    ref: document.referrer || "",
    path: `${window.location.pathname}${window.location.search}`,
    ts: new Date().toISOString(),
  };

  try {
    const response = await fetch("/api/visitors/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (response.ok) {
      sessionStorage.setItem(storageKey, "1");
    } else {
      sessionStorage.removeItem(storageKey);
    }
  } catch {
    sessionStorage.removeItem(storageKey);
    // Visitor telemetry must never block the application.
  }
}