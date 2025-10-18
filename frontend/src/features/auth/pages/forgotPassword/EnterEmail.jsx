import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../../../auth/components/AuthCard";
import Input from "../../../../shared/components/Input";
import Button from "../../../../shared/components/Button";

export default function EnterEmail() {
  const [form, setForm] = useState({ email: ""});
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState("");      // success banner text
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setServerMessage("");
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Please input your email.";
    return e;
  };

  async function verifyEmailExists(email) {
    const res = await fetch("/api/v1/users/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      throw new Error("Failed to submit email");
    }

    return { exists: true };
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    setServerMessage("");

    if (Object.keys(eObj).length > 0) return;

    try {
      setIsSubmitting(true);
      const { exists } = await verifyEmailExists(form.email);

      if (!exists) {
        setErrors((prev) => ({
          ...prev,
          email: "There is no account linked with that email. Please try again.",
        }));
        return;
      }

      // If email exists, show success banner first
      setServerMessage("Email verified. A verification code has been sent to your email.");
      // small delay so the user can see the message
      setTimeout(() => {
        navigate("/forgotpassword-verification");
      }, 3000);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        email: "Something went wrong. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
        <p className="mb-5 text-[20px] text-[#262D6C]">
          Please enter your email below:
        </p>

        {/* Success banner (shown briefly before redirect) */}
        {serverMessage && (
          <div
            className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800"
            role="status"
            aria-live="polite"
          >
            {serverMessage}
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Input
            name="email"
            type="email"
            placeholder="Enter Email"
            value={form.email}
            onChange={onChange}
            error={errors.email}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#4A53A7] hover:opacity-95 disabled:opacity-60 text-white font-bold text-[23px]"
          >
            {isSubmitting ? "Sending…" : "Send Verification Code"}
          </Button>
        </form>
      </AuthCard>
    </main>
  );
}
