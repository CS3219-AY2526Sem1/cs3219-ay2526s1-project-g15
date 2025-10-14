import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopNav from "../../../shared/components/TopNav";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import { passwordIssues } from "../../auth/utils/validators";

export default function EditProfile() {
  const navigate = useNavigate();

  // mock initial values
  // TODO: edit to actual user's account information based on backend
  const [form, setForm] = useState({
    username: "deanna",
    email: "deanna@gmail.com",
    password: "",
    confirm: "",  
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const pwErrors = passwordIssues(form.password);

  // TODO: connect to backend to check if new username is taken or not
  const usernameTaken = form.username.trim().toLowerCase() === "deanna";
  const disabledSave = !form.username.trim() || usernameTaken;

  const onSave = (e) => {
    e.preventDefault();
    if (disabledSave) return;
    // TODO: connect to backend update profile
    alert("Profile saved successfully");
  };

  return (
    <div className="min-h-screen bg-[#D7D6E6]">
      <TopNav />
      <div className="mx-auto max-w-4xl px-4 pt-10 text-xl text-[#262D6C] font-bold">Your Profile:</div>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <section>
          <p className="mb-2 text-gray-700">Username</p>
          <Input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={onChange}
            error={usernameTaken ? "This username is already taken." : undefined}
            className="bg-[#68659A] text-white placeholder-white"
          />
        </section>

        <section>
          <p className="mb-2 text-gray-700">Email</p>
          <Input
            name="email"
            value={form.email}
            readOnly
            className="bg-gray-400 text-white placeholder-white cursor-not-allowed focus:outline-none focus:ring-0 focus:border-none"
          />
        </section>

        <section>
        <p className="mb-2 text-gray-700">Password</p>

        <Input
            name="password"
            type="password"
            revealable
            placeholder="New password"
            value={form.password}
            onChange={onChange}
            className="bg-[#68659A] text-white placeholder-white"
        />

        {form.password && pwErrors.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
            <p>Password does not satisfy the following:</p>
            <ul className="list-disc ml-6">
                {pwErrors.map((e) => (
                <li key={e}>{e}</li>
                ))}
            </ul>
            </div>
        )}

        <div className="mt-5">
            <Input
            name="confirm"
            type="password"
            revealable
            placeholder="Confirm new password"
            value={form.confirm ?? ""}  
            onChange={onChange}
            error={
                form.confirm && form.confirm !== form.password
                ? "Passwords do not match."
                : undefined
            }
            className="bg-[#68659A] text-white placeholder-white"
            />
        </div>
        </section>

        <div className="mt-4 flex items-center justify-center gap-6">
          <Button
            as={Link}
            to="/profile/edit"
            className="bg-[#A04747] hover:opacity-95 text-white px-8 text-xl"
          >
            Cancel
          </Button>

          <Button
            onClick={onSave}
            disabled={disabledSave}
            className={`text-xl px-10 ${disabledSave ? "bg-[#4A53A7]/60 cursor-not-allowed" : "bg-[#4A53A7] hover:opacity-95"} text-white`}
          >
            Save
          </Button>
        </div>

        {/* Delete Account */}
        <div className="pt-4">
          <Button
            onClick={() => {
                if (typeof window !== "undefined" && window.confirm("Are you sure you want to delete your account?")) {
                // TODO: delete account logic
                navigate("/");
                }
            }}
            className="w-full bg-[#A04747] hover:opacity-95 text-white text-2xl py-3"
          >
          Delete Account
          </Button>
        </div>
      </main>
    </div>
  );
}
