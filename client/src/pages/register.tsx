import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SkipNav } from "@/components/SkipNav";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Create Account";
    return () => { document.title = "Sign in"; };
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { agreeToTerms: false },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await apiRequest("POST", "/api/auth/register", {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Account Created", description: "Your account has been created. Please sign in." });
      setLocation("/");
    },
    onError: () => {
      toast({ title: "Registration Failed", description: "Could not create your account. The username may already be taken.", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <SkipNav />
      <header className="auth-page-header"><Logo /></header>
      <div role="main" id="main-content" className="auth-form-container">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4" />Back to Sign In
        </Link>
        <h1 className="auth-heading-primary auth-spacing-2x-mb">Create Account</h1>
        <p className="auth-text-bodyshort auth-spacing-2x-mb">Join us to start earning and redeeming rewards points.</p>
        <form onSubmit={handleSubmit((data) => registerMutation.mutate(data))} method="POST">
          <div className="auth-text-field auth-spacing-2x-mb">
            <label htmlFor="username">Username</label>
            <input id="username" type="text" {...register("username")} autoComplete="username" aria-invalid={errors.username ? "true" : "false"} data-testid="input-username" />
            {errors.username && <p className="text-destructive text-sm mt-2">{errors.username.message}</p>}
          </div>
          <div className="auth-text-field auth-spacing-2x-mb">
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" {...register("email")} autoComplete="email" aria-invalid={errors.email ? "true" : "false"} data-testid="input-email" />
            {errors.email && <p className="text-destructive text-sm mt-2">{errors.email.message}</p>}
          </div>
          <div className="auth-text-field auth-pwd-field auth-spacing-2x-mb">
            <label htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"} {...register("password")} autoComplete="new-password" aria-invalid={errors.password ? "true" : "false"} data-testid="input-password" className="w-full" />
              <button type="button" className="auth-low-emph-button auth-showpwd" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
            </div>
            {errors.password && <p className="text-destructive text-sm mt-2">{errors.password.message}</p>}
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>
          <div className="auth-text-field auth-pwd-field auth-spacing-2x-mb">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="relative">
              <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} {...register("confirmPassword")} autoComplete="new-password" aria-invalid={errors.confirmPassword ? "true" : "false"} data-testid="input-confirm-password" className="w-full" />
              <button type="button" className="auth-low-emph-button auth-showpwd" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? "Hide" : "Show"}</button>
            </div>
            {errors.confirmPassword && <p className="text-destructive text-sm mt-2">{errors.confirmPassword.message}</p>}
          </div>
          <div className="auth-checkbox auth-spacing-3x-mb">
            <input type="checkbox" id="agreeToTerms" {...register("agreeToTerms")} data-testid="checkbox-agree-terms" />
            <label htmlFor="agreeToTerms">
              I agree to the{" "}<Link href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</Link>{" "}and{" "}<Link href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9.54,14.81l8-8a1.09,1.09,0,0,1,1.54,0l0,0a1.1,1.1,0,0,1,0,1.54l-8.78,8.78s0,0,0,0a1.12,1.12,0,0,1-.79.33h0a1.15,1.15,0,0,1-.41-.08,1.08,1.08,0,0,1-.39-.25L4.86,13.31a1.13,1.13,0,0,1,.8-1.92,1.11,1.11,0,0,1,.79.33Z" />
              </svg>
            </label>
            {errors.agreeToTerms && <p className="text-destructive text-sm mt-2">{errors.agreeToTerms.message}</p>}
          </div>
          <button type="submit" className="auth-high-emph-button auth-spacing-2x-mb" disabled={registerMutation.isPending} data-testid="button-create-account">
            {registerMutation.isPending ? "Creating Account…" : "Create Account"}
          </button>
          <p className="text-sm text-gray-600 text-center">
            Already have an account?{" "}<Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">Sign In</Link>
          </p>
        </form>
      </div>
      <Footer />
    </div>
  );
}
