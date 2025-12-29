import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SkipNav } from "@/components/SkipNav";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Privacy() {
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

                <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
                <p className="text-sm text-gray-500 mb-8">Last updated: December 6, 2025</p>

                <div className="prose prose-blue max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
                        <p className="text-gray-700 mb-4">
                            We collect information you provide directly to us when you create an account, including:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>Username and email address</li>
                            <li>Password (encrypted)</li>
                            <li>Phone number for SMS verification</li>
                            <li>Date of birth for age verification</li>
                            <li>IP address and device information for security</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
                        <p className="text-gray-700 mb-4">
                            We use the information we collect to:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Verify your identity and prevent fraud</li>
                            <li>Send you technical notices and security alerts</li>
                            <li>Respond to your comments and questions</li>
                            <li>Manage your rewards points and account</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information Sharing</h2>
                        <p className="text-gray-700 mb-4">
                            We do not sell your personal information. We may share your information only in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>With your consent</li>
                            <li>To comply with legal obligations</li>
                            <li>To protect our rights and prevent fraud</li>
                            <li>With service providers who assist us (under strict confidentiality agreements)</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
                        <p className="text-gray-700 mb-4">
                            We implement appropriate technical and organizational measures to protect your personal information, including:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>256-bit SSL encryption for data transmission</li>
                            <li>Encrypted password storage</li>
                            <li>Two-factor authentication via SMS</li>
                            <li>Regular security audits and testing</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights</h2>
                        <p className="text-gray-700 mb-4">
                            You have the right to:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            <li>Access your personal information</li>
                            <li>Correct inaccurate information</li>
                            <li>Request deletion of your information</li>
                            <li>Object to processing of your information</li>
                            <li>Export your data in a portable format</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Tracking</h2>
                        <p className="text-gray-700 mb-4">
                            We use cookies and similar technologies to enhance your experience and analyze usage. You can control cookies through your browser settings.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
                        <p className="text-gray-700 mb-4">
                            If you have questions about this Privacy Policy, please contact us at:
                        </p>
                        <p className="text-gray-700">
                            Email: <a href="mailto:privacy@example.com" className="text-blue-600 hover:text-blue-700">privacy@example.com</a>
                        </p>
                    </section>
                </div>
            </div>

            <Footer />
        </div>
    );
}
