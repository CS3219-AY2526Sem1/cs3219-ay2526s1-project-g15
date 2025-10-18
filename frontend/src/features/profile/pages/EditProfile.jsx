import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopNav from "../../../shared/components/TopNav";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import { passwordIssues } from "../../auth/utils/validators";
import { me } from "../../auth/api";

export default function EditProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    oldPassword: "",
    newPassword: "",
    confirm: "",
  });

  useEffect(() => {
    me().then((user) => {
      setForm((prev) => ({
        ...prev,
        username: user.name || "",
        email: user.email || "",
      }));
    });  
  }, []);

  const [oldPwStatus, setOldPwStatus] = useState("idle"); // 'idle' | 'checking' | 'valid' | 'invalid'

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const pwErrors = passwordIssues(form.newPassword);

  // TODO: swap this mock with a real API call to Auth service
  const verifyOldPassword = async () => {
    if (!form.oldPassword) {
      setOldPwStatus("idle");
      return;
    }
    setOldPwStatus("checking");
    // MOCK: treat "correct-old-password" as the right password
    await new Promise((r) => setTimeout(r, 400));
    const ok = form.oldPassword === "correct-old-password";
    setOldPwStatus(ok ? "valid" : "invalid");
  };

  const usernameTaken = form.username.trim().toLowerCase() === "deanna";
  const baseDisabled = !form.username.trim() || usernameTaken;

  // If user is changing password, enforce validations
  const wantsPwChange = oldPwStatus === "valid";
  const pwInvalid =
    wantsPwChange &&
    (!!pwErrors.length || !form.newPassword || form.newPassword !== form.confirm);

  const disabledSave = baseDisabled || oldPwStatus === "checking" || pwInvalid;

  const onSave = (e) => {
    e.preventDefault();
    if (disabledSave) return;

    // Build payload
    const payload = {
      username: form.username.trim(),
      // email is immutable
      ...(wantsPwChange
        ? { oldPassword: form.oldPassword, newPassword: form.newPassword }
        : {}),
    };

    // TODO: call backend to update profile &/or password
    console.log("submit", payload);
    alert("Profile saved successfully");
  };

  return (
    <div className="min-h-screen bg-[#D7D6E6]">
      <TopNav />
      <div className="mx-auto max-w-4xl px-4 pt-10 text-xl text-[#262D6C] font-bold">
        Your Profile:
      </div>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Username */}
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

        {/* Email */}
        <section>
          <p className="mb-2 text-gray-700">Email</p>
          <Input
            name="email"
            value={form.email}
            readOnly
            className="bg-gray-400 text-white placeholder-white cursor-not-allowed focus:outline-none focus:ring-0 focus:border-none"
          />
        </section>

        {/* Password */}
        <section>
          <p className="mb-2 text-gray-700">Old password</p>

          <Input
            name="oldPassword"
            type="password"
            revealable
            placeholder="Old password"
            value={form.oldPassword}
            onChange={(e) => {
              onChange(e);
              // reset status when editing
              setOldPwStatus("idle");
            }}
            onBlur={verifyOldPassword}
            className="bg-[#68659A] text-white placeholder-white"
          />
          {oldPwStatus === "checking" && (
            <div className="mt-2 text-sm text-gray-700">Checking…</div>
          )}
          {oldPwStatus === "invalid" && (
            <div className="mt-2 text-sm text-red-600">
              Old password is incorrect.
            </div>
          )}
          {oldPwStatus === "valid" && (
            <div className="mt-2 text-sm text-green-700">
              Old password verified.
            </div>
          )}

          {/* Forgot password */}
          <div className="pt-2">
            <Link
              to="/forgotpassword-enter-email"
              className="text-[#262D6C] font-medium underline"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Reveal new password fields only when old password is valid */}
          {wantsPwChange && (
            <div className="mt-5 space-y-5">
              <div>
                <Input
                  name="newPassword"
                  type="password"
                  revealable
                  placeholder="New password"
                  value={form.newPassword}
                  onChange={onChange}
                  className="bg-[#68659A] text-white placeholder-white"
                />
                {!!form.newPassword && pwErrors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    <p>Password does not satisfy the following:</p>
                    <ul className="list-disc ml-6">
                      {pwErrors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <Input
                  name="confirm"
                  type="password"
                  revealable
                  placeholder="Confirm new password"
                  value={form.confirm}
                  onChange={onChange}
                  error={
                    form.confirm && form.confirm !== form.newPassword
                      ? "Passwords do not match."
                      : undefined
                  }
                  className="bg-[#68659A] text-white placeholder-white"
                />
              </div>
            </div>
          )}
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
            className={`text-xl px-10 ${
              disabledSave
                ? "bg-[#4A53A7]/60 cursor-not-allowed"
                : "bg-[#4A53A7] hover:opacity-95"
            } text-white`}
          >
            Save
          </Button>
        </div>

        {/* Delete Account */}
        <div className="pt-4">
          <Button
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                window.confirm("Are you sure you want to delete your account?")
              ) {
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
