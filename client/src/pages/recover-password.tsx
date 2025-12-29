import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SkipNav } from "@/components/SkipNav";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";

const recoverSchema = z.object({
    username: z.string().min(1, "Please enter your username"),
});

type RecoverFormData = z.infer<typeof recoverSchema>;

export default function RecoverPassword() {
    const [submitted, setSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RecoverFormData>({
        resolver: zodResolver(recoverSchema),
    });

    const onSubmit = (data: RecoverFormData) => {
        console.log("Password recovery for:", data.username);
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-white">
            <SkipNav />
            <header className="auth-page-header">
                <Logo />
            </header>

            <div role="main" id="main-content" className="auth-form-container">
                {!submitted ? (
                    <>
                        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Sign In
                        </Link>

                        <h1 className="auth-heading-primary auth-spacing-2x-mb">Reset Password</h1>
                        <p className="auth-text-bodyshort auth-spacing-2x-mb">
                            Enter your username and we'll send password reset instructions to your registered email.
                        </p>

                        <form onSubmit={handleSubmit(onSubmit)} method="POST">
                            <div className="auth-text-field auth-spacing-2x-mb">
                                <label htmlFor="username">Username</label>
                                <input
                                    id="username"
                                    type="text"
                                    {...register("username")}
                                    autoComplete="username"
                                    aria-invalid={errors.username ? "true" : "false"}
                                    aria-required="true"
                                    data-testid="input-username"
                                />
                                {errors.username && (
                                    <p className="text-destructive text-sm mt-2" data-testid="text-username-error">
                                        {errors.username.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="auth-high-emph-button auth-spacing-2x-mb"
                                data-testid="button-reset-password"
                            >
                                Send Reset Link
                            </button>

                            <p className="text-sm text-gray-600 text-center">
                                <Link href="/recover-username" className="text-blue-600 hover:text-blue-700">
                                    Forgot your username?
                                </Link>
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
                            If an account exists with that username, we've sent password reset instructions to your email.
                        </p>
                        <p className="text-sm text-gray-600 auth-spacing-2x-mb">
                            The link will expire in 24 hours for security.
                        </p>
                        <Link href="/" className="auth-medium-emph-button">
                            Return to Sign In
                        </Link>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
