import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import AuthCard from "../../components/AuthCard";
import Button from "../../../../shared/components/Button";
import { verifyEmail } from "../../api";

export default function EmailVerified() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [status, setStatus] = useState("pending");

   useEffect(() => {
    (async () => {
      try {
        if (!token) throw new Error("Missing token");
        await verifyEmail(token);
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    })();
  }, [token]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
        <h1 className="mb-3 flex items-center justify-center text-4xl font-bold text-[#262D6C]">
          Email verified!
        </h1>

        <div className="max-w-md text-center space-y-4">
          <p className="text-[#000000]">
            Your email has been successfully verified. You can now sign in to your account.
          </p>

          <Button
            className="w-full bg-[#4A53A7] hover:bg-brand-700 text-white font-bold text-[18px] h-12"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </Button>
        </div>
      </AuthCard>
    </main>
  );
}
