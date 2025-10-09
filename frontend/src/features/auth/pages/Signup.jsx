import { Link } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../components/AuthCard";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import { passwordIssues } from "../utils/validators";

export default function Signup() {
  const [form, setForm] = useState({ username:"", email:"", password:"", confirm:"" });
  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const taken = { username: form.username === "alice", email: form.email === "alice@email.com" };
  const pwErrors = passwordIssues(form.password);
  const disabled = !form.username || !form.email || form.password !== form.confirm || pwErrors.length;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
         <h1 className="mb-5 flex items-center justify-center text-4xl font-bold text-[#262D6C]">Create Account</h1>
        <p className="text-center text-[#999999] mb-4">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#262D6C] hover:underline">Sign in</Link>
        </p>

        <div className="space-y-4">
          <Input name="username" placeholder="Username" value={form.username}
                 onChange={onChange} error={taken.username ? "This username is already taken." : undefined} />
          <Input name="email" type="email" placeholder="Email" value={form.email}
                 onChange={onChange} error={taken.email ? "This email is already taken." : undefined} />
          <Input name="password" type="password" revealable placeholder="Password" value={form.password} onChange={onChange} />
          {!!pwErrors.length && (
            <div className="text-sm text-red-600 -mt-2">
              <p>Password does not satisfy the following:</p>
              <ul className="list-disc ml-6">{pwErrors.map(e => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          <Input name="confirm" type="password" revealable placeholder="Confirm Password" value={form.confirm}
                 onChange={onChange} error={form.confirm && form.confirm !== form.password ? "Passwords do not match." : undefined} />

          <Button
            className={`w-full ${disabled ? "bg-[#4A53A7] cursor-not-allowed" : "bg-[#4A53A7] hover:bg-brand-700"} text-white font-bold text-[23px] mt-5`}
            disabled={disabled}
            
            // TODO: Sign up logic
            onClick={() => alert("Sign up (mock)")}
          >
            Sign Up
          </Button>
        </div>
      </AuthCard>
    </main>
  );
}
