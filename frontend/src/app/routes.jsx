import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "../features/auth/pages/Landing";
import Login from "../features/auth/pages/Login";
import Signup from "../features/auth/pages/Signup";
import Verification from "../features/auth/pages/forgotPassword/Verification";
import ForgotPassword from "../features/auth/pages/forgotPassword/ForgotPassword";
import Home from "../features/home/pages/Home";
import Sessions from "../features/session/pages/Sessions";
import Room from "../features/session/pages/Room";
import EditProfile from "../features/profile/pages/EditProfile";

export default function RoutesDef() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgotpassword-verification" element={<Verification/>}/>
      <Route path="/forgotpassword" element={<ForgotPassword/>}/>
      <Route path="/home" element={<Home />} />
      <Route path="/sessions" element={<Sessions />} />
      <Route path="/session/active" element={<Room />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
