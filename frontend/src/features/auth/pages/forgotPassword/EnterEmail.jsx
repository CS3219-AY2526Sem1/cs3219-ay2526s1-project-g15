import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../../../auth/components/AuthCard";
import Input from "../../../../shared/components/Input";
import Button from "../../../../shared/components/Button";

export default function EnterEmail() {
  const [form, setForm] = useState({ email: ""});
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Please input your email.";
    return e;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    // if there are no validation errors, 
    if (Object.keys(eObj).length === 0) {
      // TODO: backend logic when inputting email
      navigate("/forgotpassword-verification");
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
        <p className="mb-5 text-[20px] text-[#262D6C]">Please enter your email below:</p>
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
            className="w-full bg-[#4A53A7] hover:opacity-95 text-white font-bold text-[23px]"
          >
            Send Verification Code
          </Button>
        </form>
      </AuthCard>
    </main>
  );
}
