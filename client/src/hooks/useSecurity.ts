import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Behavioral data collected for bot detection
 */
export interface BehavioralData {
    mouseMovements: number;
    keystrokes: number;
    timeOnForm: number;
    scrollEvents: number;
    focusChanges: number;
}

/**
 * Security metadata to include with form submissions
 */
export interface SecurityPayload {
    _behavioral: BehavioralData;
    _js_verified: string;
}

/**
 * Hook to collect behavioral data for bot detection and to bootstrap
 * server-issued CSRF token + HMAC nonce on page load.
 *
 * Flow:
 *  1. Call startTracking() on mount — starts behavioral tracking AND
 *     fetches /api/security/csrf and /api/security/nonce from the server.
 *  2. Call getSecurityPayload() when submitting — returns behavioral data
 *     plus the server-issued nonce as _js_verified.
 *  3. Call getCSRFToken() to get the token for X-CSRF-Token request header.
 *
 * The server verifies:
 *  - X-CSRF-Token header matches the one-time token issued to this IP.
 *  - _js_verified is a valid HMAC nonce issued at least 2 s before submission.
 */
export function useSecurity() {
    const [tracking, setTracking] = useState(false);
    const startTimeRef = useRef<number>(Date.now());
    const dataRef = useRef<BehavioralData>({
        mouseMovements: 0,
        keystrokes: 0,
        timeOnForm: 0,
        scrollEvents: 0,
        focusChanges: 0,
    });

    // Server-issued tokens — fetched once on startTracking()
    const csrfTokenRef = useRef<string>("");
    const serverNonceRef = useRef<string>("");

    // Track mouse movements
    const handleMouseMove = useCallback(() => {
        dataRef.current.mouseMovements++;
    }, []);

    // Track keystrokes
    const handleKeyDown = useCallback(() => {
        dataRef.current.keystrokes++;
    }, []);

    // Track scroll events
    const handleScroll = useCallback(() => {
        dataRef.current.scrollEvents++;
    }, []);

    // Track focus changes
    const handleFocus = useCallback(() => {
        dataRef.current.focusChanges++;
    }, []);

    // Start tracking behavioral data + prefetch CSRF token and nonce
    const startTracking = useCallback(() => {
        if (tracking) return;

        setTracking(true);
        startTimeRef.current = Date.now();

        // Reset behavioral counters
        dataRef.current = {
            mouseMovements: 0,
            keystrokes: 0,
            timeOnForm: 0,
            scrollEvents: 0,
            focusChanges: 0,
        };

        // Add event listeners
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("scroll", handleScroll);
        document.addEventListener("focusin", handleFocus);

        // Fetch CSRF token and server nonce in parallel (page-load time)
        Promise.all([
            fetch("/api/security/csrf").then((r) => r.json()).catch(() => ({})),
            fetch("/api/security/nonce").then((r) => r.json()).catch(() => ({})),
        ]).then(([csrfData, nonceData]) => {
            if (csrfData?.token) csrfTokenRef.current = csrfData.token;
            if (nonceData?.nonce) serverNonceRef.current = nonceData.nonce;
        });
    }, [tracking, handleMouseMove, handleKeyDown, handleScroll, handleFocus]);

    // Stop tracking and cleanup
    const stopTracking = useCallback(() => {
        setTracking(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("scroll", handleScroll);
        document.removeEventListener("focusin", handleFocus);
    }, [handleMouseMove, handleKeyDown, handleScroll, handleFocus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    /**
     * Returns the security payload to include in every form POST body.
     * _js_verified is the server-issued HMAC nonce (proves JS ran + 2 s delay).
     */
    const getSecurityPayload = useCallback((): SecurityPayload => {
        dataRef.current.timeOnForm = Date.now() - startTimeRef.current;
        return {
            _behavioral: { ...dataRef.current },
            _js_verified: serverNonceRef.current,
        };
    }, []);

    /**
     * Returns the CSRF token for the X-CSRF-Token request header.
     * Empty string if the token has not loaded yet.
     */
    const getCSRFToken = useCallback((): string => {
        return csrfTokenRef.current;
    }, []);

    /**
     * Fetches a fresh CSRF token only (nonce unchanged).
     * Use this between form steps — the existing nonce is already old enough
     * and replacing it would reset the 2-second minimum-age clock.
     */
    const refreshCSRFToken = useCallback(async (): Promise<void> => {
        const csrfData = await fetch("/api/security/csrf")
            .then((r) => r.json())
            .catch(() => ({}));
        if (csrfData?.token) csrfTokenRef.current = csrfData.token;
    }, []);

    /**
     * Fetches a fresh CSRF token AND a fresh nonce.
     * Use this only in error-recovery paths where the old nonce may have
     * expired.  After calling this you MUST wait ≥ 2 s before submitting.
     */
    const refreshTokens = useCallback(async (): Promise<void> => {
        const [csrfData, nonceData] = await Promise.all([
            fetch("/api/security/csrf").then((r) => r.json()).catch(() => ({})),
            fetch("/api/security/nonce").then((r) => r.json()).catch(() => ({})),
        ]);
        if (csrfData?.token) csrfTokenRef.current = csrfData.token;
        if (nonceData?.nonce) serverNonceRef.current = nonceData.nonce;
    }, []);

    return {
        startTracking,
        stopTracking,
        getSecurityPayload,
        getCSRFToken,
        refreshCSRFToken,
        refreshTokens,
        isTracking: tracking,
    };
}

/**
 * Standalone hook to fetch a CSRF token from the server.
 * Kept for backward compatibility — prefer useSecurity() for new code.
 */
export function useCSRFToken() {
    const [token, setToken] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchToken = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/security/csrf");
            if (!response.ok) throw new Error("Failed to fetch security token");
            const data = await response.json();
            setToken(data.token);
            setExpiresAt(data.expiresAt);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const isExpired = useCallback(() => {
        if (!expiresAt) return true;
        return Date.now() > expiresAt - 60000;
    }, [expiresAt]);

    return { token, expiresAt, isLoading, error, fetchToken, isExpired };
}

export default useSecurity;
