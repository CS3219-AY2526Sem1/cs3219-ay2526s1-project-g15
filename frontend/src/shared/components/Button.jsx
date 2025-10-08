export default function Button({ as:Tag="button", className="", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-3xl px-5 py-4 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  return <Tag className={`${base} ${className}`} {...props} />;
}
