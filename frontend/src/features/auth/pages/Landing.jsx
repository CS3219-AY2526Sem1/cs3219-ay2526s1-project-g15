import { Link } from "react-router-dom";
import Logo from "../../../shared/assets/Logo.png";
import Button from "../../../shared/components/Button";
import GithubLogo from "../../../shared/assets/GithubLogo.png";
import GoogleLogo from "../../../shared/assets/GoogleLogo.png";

export default function Landing() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-xl text-center">
        <div className="flex items-center justify-center gap-6 mb-6">
            <img
                src={Logo}
                alt="PeerPrep logo"
                className="h-30 w-30 object-contain select-none pointer-events-none"
            />
            <h1 className="text-5xl font-bold text-[#4A53A7]">PeerPrep</h1>
        </div>
        <p className="text-4xl md:text-3xl text-[#262D6C] mb-6 font-bold">
          Join now and find your coding partner
        </p>

        <div className="flex flex-col gap-5">
          <Button as={Link} to="/login" className="bg-[#4A53A7] hover:bg-brand-700 text-white font-bold text-2xl">
            Login
          </Button>
          <Button as={Link} to="/signup" className="bg-gray-100 hover:bg-gray-200 text-[#262D6C] font-bold text-2xl">
            Create Account
          </Button>
        </div>

        {/* <div className="my-3 flex items-center justify-center gap-6 mb-6">
            <img
                src={GoogleLogo}
                alt="PeerPrep logo"
                className="h-[60px] w-[60px] object-contain select-none pointer-events-none"
            />
            <img
                src={GithubLogo}
                alt="PeerPrep logo"
                className="h-20 w-20 object-contain select-none pointer-events-none"
            />
        </div> */}
      </div>
    </main>
  );
}
