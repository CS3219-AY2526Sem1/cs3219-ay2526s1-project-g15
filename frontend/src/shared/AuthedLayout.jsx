import { Outlet, useNavigate } from "react-router-dom";
import useSessionKeepAlive from "./auth/useSessionKeepAlive";
import SessionExtendModal from "./components/SessionExtendModal";

export default function AuthedLayout() {
    const navigate = useNavigate();

    const { showPrompt, secondsLeft, continueSession, signOutNow } = useSessionKeepAlive({
        warningSeconds: 60,
        onLogout: () => navigate("/login", { replace: true }),
    });

    return (
        <>
        <Outlet />
        <SessionExtendModal
            open={showPrompt}
            secondsLeft={secondsLeft}
            onContinue={continueSession}
            onLogout={signOutNow}
        />
        </>
    );
}