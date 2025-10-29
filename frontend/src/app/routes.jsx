import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "../features/auth/pages/Landing";
import Login from "../features/auth/pages/Login";
import Signup from "../features/auth/pages/signUp/Signup";
import EmailVerified from "../features/auth/pages/signUp/EmailVerified";
import SignUpVerification from "../features/auth/pages/signUp/SignUpVerification";
import Verification from "../features/auth/pages/forgotPassword/Verification";
import EnterEmail from "../features/auth/pages/forgotPassword/EnterEmail";
import ForgotPassword from "../features/auth/pages/forgotPassword/ForgotPassword";
import Home from "../features/home/pages/Home";
import History from "../features/session/pages/History";
import SessionLoading from "../features/home/components/SessionLoading";
import Room from "../features/session/pages/Room";
import EditProfile from "../features/profile/pages/EditProfile";
import ProtectedRoute from "../shared/ProtectedRoute";
import AdminRoute from "../shared/AdminRoute";
import AdminHome from "../features/admin/pages/AdminHome";
import AddQuestion from "../features/admin/pages/AddQuestion";
import EditQuestion from "../features/admin/pages/EditQuestion";
import AdminQuestionView from "../features/admin/pages/AdminQuestionView";
import AdminEditProfile from "../features/admin/pages/AdminEditProfile";

export default function RoutesDef() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signup/verification" element={<SignUpVerification />} />
      <Route path="/verify-email" element={<EmailVerified />} />
      <Route path="/forgotpassword-verification" element={<Verification />} />
      <Route path="/forgotpassword-enter-email" element={<EnterEmail />} />
      <Route path="/forgotpassword" element={<ForgotPassword />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/session/active/:sessionId" element={<Room />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        
        {/* Admin-only Routes  */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/home" element={<AdminHome />} />
          <Route path="/admin/profile/edit" element={<AdminEditProfile />} />
          <Route path="/admin/questions/:id" element={<AdminQuestionView />} />
          <Route path="/admin/add-questions" element={<AddQuestion />} />
          <Route path="/admin/questions/:id/edit" element={<EditQuestion />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
