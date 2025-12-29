import { Link } from "wouter";

export function Footer() {
    return (
        <footer className="auth-footer">
            <div className="auth-footer-content">
                <p className="auth-footer-copyright">Copyright © 2025</p>
                <Link href="/privacy" className="auth-footer-privacy" data-testid="link-privacy">
                    Privacy
                </Link>
                <Link href="/terms" className="auth-footer-terms" data-testid="link-terms">
                    Terms of use
                </Link>
            </div>
        </footer>
    );
}
