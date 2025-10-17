import { useState } from "react";
import AuthCard from "../../../auth/components/AuthCard";
import Input from "../../../../shared/components/Input";
import Button from "../../../../shared/components/Button";
import { passwordIssues } from "../../utils/validators";

export default function ForgotPassword() {
  const [form, setForm] = useState({ password:"", confirm:"" });
  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const pwErrors = passwordIssues(form.password);
  const disabled = form.password !== form.confirm || pwErrors.length;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
         <h1 className="mb-5 flex items-center justify-center text-4xl font-bold text-[#262D6C]">Reset Password</h1>

        <div className="space-y-4">
          <Input name="password" type="password" revealable placeholder="New password" value={form.password} onChange={onChange} />
          {!!pwErrors.length && (
            <div className="text-sm text-[#999999] -mt-2">
              <p>Password does not satisfy the following:</p>
              <ul className="list-disc ml-6">{pwErrors.map(e => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          <Input name="confirm" type="password" revealable placeholder="Confirm new password" value={form.confirm}
                 onChange={onChange} error={form.confirm && form.confirm !== form.password ? "Passwords do not match." : undefined} />

          <Button
            className={`w-full ${disabled ? "bg-[#4A53A7] cursor-not-allowed" : "bg-[#4A53A7] hover:bg-brand-700"} text-white font-bold text-[23px] mt-5`}
            disabled={disabled}
            
            // TODO: Save new password logic
            onClick={() => alert("Save (mock)")}
          >
            Save
          </Button>
        </div>
      </AuthCard>
    </main>
  );
}
