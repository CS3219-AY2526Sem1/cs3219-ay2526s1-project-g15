export default function SubmitBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mb-3 w-full rounded-md bg-indigo-100 text-indigo-700 px-3 py-2 text-sm font-medium border border-indigo-300 transition-all">
      {message}
    </div>
  );
}