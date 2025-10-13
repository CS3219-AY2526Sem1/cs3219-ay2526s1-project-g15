export default function DifficultyPicker({ value, onChange }) {
  const options = ["Easy", "Medium", "Hard"];

  return (
    <fieldset className="text-center">
      <legend className="text-gray-600 mb-2 text-[20px]">Select your difficulty level</legend>

      <div className="inline-flex rounded-2xl bg-[#68659A] text-white overflow-hidden">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <label
              key={opt}
              className={`px-6 py-3 flex items-center gap-2 cursor-pointer select-none
                          ${active ? "bg-[#262D6C] font-bold" : "bg-transparent font-semibold"}`}
            >
              <input
                type="radio"
                name="difficulty"
                value={opt}
                checked={active}
                onChange={(e)=>onChange(e.target.value)}
                className="sr-only"
              />
              <span className="rounded-full border-2 w-3 h-3 grid place-items-center">
                {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              {opt}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
