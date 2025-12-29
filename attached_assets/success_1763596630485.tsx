import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Success() {
  const [location, setLocation] = useLocation();

  const goBack = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Company Header */}
      <header className="auth-page-header border-b border-slate-200 bg-white/70 backdrop-blur">
        <Logo />
      </header>

      <div
        role="main"
        className="auth-form-container flex items-center justify-center py-10"
      >
        <Card className="w-full max-w-md border-slate-200 shadow-lg shadow-slate-100">
          <CardHeader className="pb-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="mt-4 text-center text-xl font-semibold text-slate-900">
              Verification Successful
            </CardTitle>
            <p className="mt-2 text-center text-sm text-slate-500">
              Your identity has been successfully verified.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-lg border border-green-200 bg-green-50/90 p-4 text-sm text-green-900">
              <p className="font-medium mb-1">You’re all set ✅</p>
              <p className="text-sm">
                SMS verification is complete. Your points will be added to your
                account within <span className="font-semibold">2–5 business days</span>.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={goBack}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-back-home"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to homepage
              </Button>
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
