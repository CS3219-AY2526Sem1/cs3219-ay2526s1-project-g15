import Logo from "../../../shared/assets/Logo.png";

export default function AuthCard({ title, children }) {
  return (
    <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-card">
      <div className="flex flex-row items-center justify-center gap-2 mb-6">
          <img
            src={Logo}
            alt="PeerPrep logo"
            className="h-[90px] w-[90px] object-contain select-none pointer-events-none"
            />
        <h1 className="text-4xl font-bold text-[#4A53A7]">{title}</h1>
      </div>
      {children}
    </div>
  );
}
