import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../components/AuthCard";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import { login as apiLogin, me as apiMe } from "../api";
import { setAccessToken } from "../../../shared/api/client";

const isValidEmail = (email) => {
  if (!email) return false;
  const trimmed = email.trim();
  const pattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return pattern.test(trimmed);
};

// Normalize error into a friendly string
const normalizeError = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 401) return "Email or password is invalid.";
  if (status === 403) {
    // e.g., lockout message from backend
    if (typeof data?.detail === "string") return data.detail;
    return "Your account is temporarily locked. Please try again later.";
  }
  if (status === 422) return "Please enter a valid email address.";

  if (Array.isArray(data?.detail)) {
    return data.detail.map((e) => e.msg || String(e)).join(" ");
  }
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;

  return "Login failed. Please try again.";
};

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const emailTrimmed = form.email.trim();
  const emailInlineErr =
    emailTrimmed && !isValidEmail(emailTrimmed) ? "Please enter a valid email address." : undefined;

  const validate = () => {
    const e = {};
    if (!emailTrimmed) e.email = "Email is required.";
    if (emailInlineErr) e.email = emailInlineErr;
    if (!form.password.trim()) e.password = "Password is required.";
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    setServerError("");
    if (Object.keys(eObj).length !== 0) return;

    setSubmitting(true);
    try {
      const data = await apiLogin({
        email: emailTrimmed.toLowerCase(), // normalize before sending
        password: form.password,
      });

      if (data?.access_token) setAccessToken(data.access_token);
      await apiMe().catch(() => {}); // optional
      navigate("/home");
    } catch (err) {
      setServerError(normalizeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
        <h1 className="mb-5 flex items-center justify-center text-4xl font-bold text-[#262D6C]">
          Sign In
        </h1>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={onChange}
            error={errors.email}
          />

          <Input
            name="password"
            type="password"
            revealable
            placeholder="Password"
            value={form.password}
            onChange={onChange}
            error={errors.password}
          />

          <div className="pt-1 pb-1">
            <Link to="/forgotpassword-enter-email" className="text-[#262D6C] font-medium underline">
              Forgot Password?
            </Link>
          </div>

          {serverError && <p className="text-sm text-red-600 -mt-1">{serverError}</p>}

          <Button
            type="submit"
            className="w-full bg-[#4A53A7] hover:opacity-95 text-white font-bold text-[23px]"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Login"}
          </Button>
        </form>

        <p className="text-center text-black mt-4">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-[#262D6C] hover:underline font-semibold">
            Create one
          </Link>
        </p>
      </AuthCard>
    </main>
  );
}
