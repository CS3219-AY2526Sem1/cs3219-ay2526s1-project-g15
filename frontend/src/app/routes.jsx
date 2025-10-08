import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "../features/auth/pages/Landing";
import Login from "../features/auth/pages/Login";
import Signup from "../features/auth/pages/Signup";

export default function RoutesDef() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
