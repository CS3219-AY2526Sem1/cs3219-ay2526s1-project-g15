import { useEffect, useRef, useState } from "react";
import { getAccessToken, msUntilExpiry, clearTokens } from "./token";
import { refreshAccessToken } from "./refresh";

export default function useSessionKeepAlive({
    warningSeconds = 60,
    onLogout = () => (window.location.href = "/login"),
    } = {}) {
    const [showPrompt, setShowPrompt] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(warningSeconds);

    const warnTimer = useRef(null);
    const expireTimer = useRef(null);
    const tickTimer = useRef(null);
    const loggingOut = useRef(false);

    function clearAllTimers() {
        if (warnTimer.current) {
            clearTimeout(warnTimer.current);
            warnTimer.current = null;
        }
        if (expireTimer.current) {
            clearTimeout(expireTimer.current);
            expireTimer.current = null;
        }
        if (tickTimer.current) {
            clearInterval(tickTimer.current);
            tickTimer.current = null;
        }
    }

    async function doLogout() {
        if (loggingOut.current) return;
        loggingOut.current = true;

        clearAllTimers();
        clearTokens();
        setShowPrompt(false);
        onLogout();
    }

    async function doRefresh() {
        try {
            await refreshAccessToken();
            setShowPrompt(false);
            schedule();
        } catch {
            await doLogout();
        }
    }

    function schedule() {
        clearAllTimers();
        const token = getAccessToken();
        if (!token) {
            setShowPrompt(false);
            return;
        }

        const ms = msUntilExpiry(token);
        if (ms <= 0) return doLogout();

        const warningMs = warningSeconds * 1000;

        const warnMs = Math.max(ms - warningMs, 0);
        const expireMs = ms;

        warnTimer.current = setTimeout(() => {
            setShowPrompt(true);

        const currentToken = getAccessToken();
        const remainingMs = currentToken ? msUntilExpiry(currentToken) : 0;

        let initialSeconds;
        if (remainingMs > 0) {
            initialSeconds = Math.min(
            warningSeconds,
            Math.ceil(remainingMs / 1000)
            );
        } else {
            initialSeconds = 0;
        }

        setSecondsLeft(initialSeconds);

        // Start 1-second ticking countdown
        tickTimer.current = setInterval(() => {
            setSecondsLeft((s) => {
            if (s <= 1) {
                clearInterval(tickTimer.current);
                return 0;
            }
            return s - 1;
            });
        }, 1000);
        }, warnMs);
            
        expireTimer.current = setTimeout(() => doLogout(), expireMs);
    }

    useEffect(() => {
        schedule();
        const onFocus = () => schedule();
        window.addEventListener("focus", onFocus);
        return () => { clearAllTimers(); window.removeEventListener("focus", onFocus); };  
    }, []);

    return { showPrompt, secondsLeft, continueSession: doRefresh, signOutNow: doLogout };
}