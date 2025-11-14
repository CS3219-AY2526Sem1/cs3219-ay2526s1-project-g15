import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../../components/AuthCard";
import Input from "../../../../shared/components/Input";
import Button from "../../../../shared/components/Button";
import { passwordIssues } from "../../utils/validators";
import { register as apiRegister } from "../../api";

// email validation (mirrors backend EmailStr behaviour)
const isValidEmail = (email) => {
  if (!email) return false;
  const trimmed = email.trim();
  const pattern =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return pattern.test(trimmed);
};

export default function Signup() {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const navigate = useNavigate();

  const pwErrors = passwordIssues(form.password);

  const normalizedEmail = form.email.trim();
  const emailErr =
    normalizedEmail && !isValidEmail(normalizedEmail)
      ? "Please enter a valid email address."
      : undefined;

  const disabled =
    submitting ||
    !form.username ||
    // must not be blank
    !normalizedEmail || 
    // must be valid      
    !!emailErr ||             
    form.password !== form.confirm ||
    pwErrors.length > 0;

  const handleSignup = async () => {
    if (disabled) return;
    setSubmitting(true);
    setServerError("");

    try {
      await apiRegister({
        // send normalised email
        email: normalizedEmail.toLowerCase(),  
        password: form.password,
        name: form.username,
      });
      navigate("/signup/verification");
    } catch (err) {
      const d = err?.response?.data;
      const msg = Array.isArray(d?.detail)
        ? d.detail.map((e) => e.msg || String(e)).join(" ")
        : d?.detail || d?.message || "Something went wrong while creating your account.";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
        <h1 className="mb-5 flex items-center justify-center text-4xl font-bold text-[#262D6C]">
          Create Account
        </h1>
        <p className="text-center text-[#999999] mb-4">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#262D6C] hover:underline">
            Sign in
          </Link>
        </p>

        <div className="space-y-4">
          <Input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={onChange}
          />

          {/* Email with inline error */}
          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={onChange}
            error={emailErr}
          />

          <Input
            name="password"
            type="password"
            revealable
            placeholder="Password"
            value={form.password}
            onChange={onChange}
          />

          {!!pwErrors.length && (
            <div className="text-sm text-red-600 -mt-2">
              <p>Password does not satisfy the following:</p>
              <ul className="list-disc ml-6">
                {pwErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <Input
            name="confirm"
            type="password"
            revealable
            placeholder="Confirm Password"
            value={form.confirm}
            onChange={onChange}
            error={
              form.confirm && form.confirm !== form.password ? "Passwords do not match." : undefined
            }
          />

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <Button
            className={`w-full ${
              disabled ? "bg-[#4A53A7] cursor-not-allowed" : "bg-[#4A53A7] hover:bg-brand-700"
            } text-white font-bold text-[23px] mt-2`}
            disabled={disabled}
            onClick={handleSignup}
          >
            {submitting ? "Signing you up..." : "Sign Up"}
          </Button>
        </div>
      </AuthCard>
    </main>
  );
}
