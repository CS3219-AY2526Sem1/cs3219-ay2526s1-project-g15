import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../../../auth/components/AuthCard";
import Input from "../../../../shared/components/Input";
import Button from "../../../../shared/components/Button";

export default function Verification() {
  const [form, setForm] = useState({ code: ""});
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "Please input the verification code.";
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length === 0) {
      try {
        const email = localStorage.getItem("forgotPasswordEmail");
        const response = await fetch("/api/v1/users/auth/verify-reset-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, code: form.code }),
        });
        const result = await response.json();
        if (result.ok) {
          navigate("/forgotpassword", { state: { email } });
        } else {
          setErrors({code: "Invalid verification code. Please try again."});
        }
      } catch (err) {
        setErrors({code: "Something went wrong. Try again later."});
      }
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <AuthCard title="PeerPrep">
        <p className="mb-5 text-[20px] text-[#262D6C]">You have been sent a code to the email you used to sign up with PeerPrep. Please input the verification code below:</p>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Input
            name="code"
            type="code"
            placeholder="Enter verification code"
            value={form.code}
            onChange={onChange}
            error={errors.code}
          />

          <Button
            type="submit"
            className="w-full bg-[#4A53A7] hover:opacity-95 text-white font-bold text-[23px]"
          >
            Verify
          </Button>
        </form>
      </AuthCard>
    </main>
  );
}
