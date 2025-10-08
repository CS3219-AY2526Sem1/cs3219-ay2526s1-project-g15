import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../components/AuthCard";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required.";
    if (!form.password.trim()) e.password = "Password is required.";
    return e;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length === 0) {
      // TODO: backend logic when logging in
      navigate("/home");
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
        <h1 className="mb-5 flex items-center justify-center text-4xl font-bold text-[#262D6C]">Sign In</h1>
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
            revealable placeholder="Password"
            value={form.password}
            onChange={onChange}
            error={errors.password}
          />

         {/* TODO: forgot password logic */}
          <div className="pt-1 pb-1">
            <Link to="/forgotpassword" className="text-[#262D6C] font-medium underline">
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#4A53A7] hover:opacity-95 text-white font-bold text-[23px]"
          >
            Login
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
