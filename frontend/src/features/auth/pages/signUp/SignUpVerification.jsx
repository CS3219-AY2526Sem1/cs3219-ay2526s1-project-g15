import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthCard from "../../components/AuthCard";

export default function SignupVerification() {
  const [sp] = useSearchParams();
  const email = sp.get("email") || "your email";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
        <h1 className="mb-5 flex items-center justify-center text-4xl font-bold text-[#262D6C]">
          Verify your email
        </h1>

        <div className="max-w-md text-center space-y-4">
          <p className="text-[#000000]">
            We’ve sent a verification link to{" "}
            <span className="font-semibold text-[#262D6C]">{email}</span>. Please check your inbox
            and click the link to complete your sign up.
          </p>

          <div className="text-sm text-[#000000]">
            Didn’t receive it? Check your spam folder. You can also try again later.
          </div>

          <div className="text-center text-sm text-[#000000]">
            Wrong email?{" "}
            <Link to="/signup" className="font-semibold text-[#262D6C] hover:underline">
              Go back to sign up
            </Link>
          </div>
        </div>
      </AuthCard>
    </main>
  );
}
