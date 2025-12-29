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
 * Hook to collect behavioral data for bot detection and security
 * 
 * Usage:
 * ```tsx
 * const { getSecurityPayload, startTracking } = useSecurity();
 * 
 * useEffect(() => { startTracking(); }, [startTracking]);
 * 
 * const handleSubmit = () => {
 *   const payload = {
 *     ...formData,
 *     ...getSecurityPayload(),
 *   };
 *   // Submit payload
 * };
 * ```
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

    // Generate a unique nonce for JS verification
    const jsNonceRef = useRef<string>(
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2) + Date.now().toString(36)
    );

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

    // Start tracking behavioral data
    const startTracking = useCallback(() => {
        if (tracking) return;

        setTracking(true);
        startTimeRef.current = Date.now();

        // Reset data
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

    // Get the security payload to include with form submission
    const getSecurityPayload = useCallback((): SecurityPayload => {
        // Calculate time on form
        dataRef.current.timeOnForm = Date.now() - startTimeRef.current;

        return {
            _behavioral: { ...dataRef.current },
            _js_verified: jsNonceRef.current,
        };
    }, []);

    return {
        startTracking,
        stopTracking,
        getSecurityPayload,
        isTracking: tracking,
    };
}

/**
 * Hook to fetch CSRF token from server
 * 
 * Usage:
 * ```tsx
 * const { token, fetchToken, isLoading } = useCSRFToken();
 * 
 * useEffect(() => { fetchToken(); }, [fetchToken]);
 * 
 * const handleSubmit = () => {
 *   fetch('/api/submit', {
 *     headers: { 'X-CSRF-Token': token },
 *     // ...
 *   });
 * };
 * ```
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
            const response = await fetch("/api/security/token");

            if (!response.ok) {
                throw new Error("Failed to fetch security token");
            }

            const data = await response.json();
            setToken(data.token);
            setExpiresAt(data.expiresAt);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
            console.error("Failed to fetch CSRF token:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Check if token is expired
    const isExpired = useCallback(() => {
        if (!expiresAt) return true;
        return Date.now() > expiresAt - 60000; // Consider expired 1 minute before actual expiry
    }, [expiresAt]);

    return {
        token,
        expiresAt,
        isLoading,
        error,
        fetchToken,
        isExpired,
    };
}

export default useSecurity;
