export default function Logo({ size=56, className="" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden>
        <circle cx="36" cy="36" r="36" fill="#5B47BF" />
        <path d="M32 28l-8 8 8 8" stroke="white" strokeWidth="4" strokeLinecap="round"/>
        <path d="M40 44l8-8-8-8" stroke="white" strokeWidth="4" strokeLinecap="round"/>
      </svg>
      <span className="text-3xl font-bold text-brand-600">PeerPrep</span>
    </div>
  );
}
