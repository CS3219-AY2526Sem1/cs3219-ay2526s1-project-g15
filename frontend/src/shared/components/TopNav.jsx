import { Link, NavLink } from "react-router-dom";
import Logo from "../assets/Logo.png";
// import Notification from "../assets/NotificationBell.png";
import ProfilePic from "../assets/ProfilePic.png";
import ProfileMenu from "./ProfileMenu";

const linkCls = ({ isActive }) =>
  `px-3 py-2 rounded-md text-xl font-medium ${isActive ? "text-[#68659A] font-bold" : "text-[#999999] hover:text-gray-900"}`;

export default function TopNav() {
  return (
    <header className="w-full bg-white backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-4 py-3 h-30 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-2">
          <img src={Logo} alt="PeerPrep" className="h-12 w-12 object-contain" />
          <span className="font-bold text-2xl text-[#4A53A7]">PeerPrep</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/home" className={linkCls}>Home</NavLink>
          {/* TODO: Link to history page */}
          <NavLink to="/history" className={linkCls}>History</NavLink>
        </nav>

        <div className="flex items-center gap-3 text-gray-600">
          <ProfileMenu avatarSrc={ProfilePic} />
        </div>
      </div>
    </header>
  );
}
