import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SkipNav } from "@/components/SkipNav";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const recoverSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type RecoverFormData = z.infer<typeof recoverSchema>;

export default function RecoverUsername() {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Recover Username";
    return () => { document.title = "Sign in"; };
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<RecoverFormData>({
    resolver: zodResolver(recoverSchema),
  });

  const recoverMutation = useMutation({
    mutationFn: async (data: RecoverFormData) => {
      const response = await apiRequest("POST", "/api/auth/recover-username", { email: data.email });
      return response.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: () => setSubmitted(true), // still show success to not reveal account existence
  });

  return (
    <div className="min-h-screen bg-white">
      <SkipNav />
      <header className="auth-page-header"><Logo /></header>
      <div role="main" id="main-content" className="auth-form-container">
        {!submitted ? (
          <>
            <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
              <ArrowLeft className="h-4 w-4" />Back to Sign In
            </Link>
            <h1 className="auth-heading-primary auth-spacing-2x-mb">Recover Username</h1>
            <p className="auth-text-bodyshort auth-spacing-2x-mb">
              Enter the email address associated with your account and we'll send you your username.
            </p>
            <form onSubmit={handleSubmit((data) => recoverMutation.mutate(data))} method="POST">
              <div className="auth-text-field auth-spacing-2x-mb">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  autoComplete="email"
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-required="true"
                  data-testid="input-email"
                />
                {errors.email && (
                  <p className="text-destructive text-sm mt-2" data-testid="text-email-error">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="auth-high-emph-button auth-spacing-2x-mb"
                disabled={recoverMutation.isPending}
                data-testid="button-send-username"
              >
                {recoverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Send My Username"}
              </button>
              <p className="text-sm text-gray-600 text-center">
                Need help? <Link href="/help" className="text-blue-600 hover:text-blue-700">Contact Support</Link>
              </p>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="auth-heading-primary auth-spacing-2x-mb">Check Your Email</h1>
            <p className="auth-text-bodyshort auth-spacing-2x-mb">
              If an account exists with that email address, we've sent your username to your inbox.
            </p>
            <p className="text-sm text-gray-600 auth-spacing-2x-mb">
              Didn't receive it? Check your spam folder or try again.
            </p>
            <Link href="/" className="auth-medium-emph-button">Return to Sign In</Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
