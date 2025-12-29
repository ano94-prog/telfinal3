import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SkipNav } from "@/components/SkipNav";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Terms() {
    return (
        <div className="min-h-screen bg-white">
            <SkipNav />
            <header className="auth-page-header">
                <Logo />
            </header>

            <div role="main" id="main-content" className="max-w-4xl mx-auto px-4 py-8">
                <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
                <p className="text-sm text-gray-500 mb-8">Last updated: December 6, 2025</p>

                <div className="prose prose-blue max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-700 mb-4">
                            By accessing and using this service, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use this service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Account Registration</h2>
                        <p className="text-gray-700 mb-4">
                            You must register for an account to use certain features of the service. You agree to:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>Provide accurate, current, and complete information</li>
                            <li>Maintain and promptly update your account information</li>
                            <li>Keep your password secure and confidential</li>
                            <li>Notify us immediately of any unauthorized use of your account</li>
                            <li>Be at least 18 years of age</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Rewards Program</h2>
                        <p className="text-gray-700 mb-4">
                            Our rewards program allows you to earn and redeem points:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>Points are earned through qualifying activities</li>
                            <li>Points have no cash value and cannot be transferred</li>
                            <li>Points may expire according to program rules</li>
                            <li>We reserve the right to modify or terminate the rewards program</li>
                            <li>Fraudulent activity will result in account termination</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Prohibited Conduct</h2>
                        <p className="text-gray-700 mb-4">
                            You agree not to:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>Use the service for any illegal purpose</li>
                            <li>Attempt to gain unauthorized access to any accounts</li>
                            <li>Interfere with or disrupt the service or servers</li>
                            <li>Use automated systems or software to extract data</li>
                            <li>Impersonate another person or entity</li>
                            <li>Transmit viruses or malicious code</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Intellectual Property</h2>
                        <p className="text-gray-700 mb-4">
                            All content, features, and functionality of the service are owned by us and are protected by copyright, trademark, and other intellectual property laws.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Limitation of Liability</h2>
                        <p className="text-gray-700 mb-4">
                            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Termination</h2>
                        <p className="text-gray-700 mb-4">
                            We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Changes to Terms</h2>
                        <p className="text-gray-700 mb-4">
                            We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Contact Information</h2>
                        <p className="text-gray-700 mb-4">
                            For questions about these Terms of Service, please contact us at:
                        </p>
                        <p className="text-gray-700">
                            Email: <a href="mailto:legal@example.com" className="text-blue-600 hover:text-blue-700">legal@example.com</a>
                        </p>
                    </section>
                </div>
            </div>

            <Footer />
        </div>
    );
}
