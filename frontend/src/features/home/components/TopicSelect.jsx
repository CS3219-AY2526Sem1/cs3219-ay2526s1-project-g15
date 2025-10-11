export default function TopicSelect({ value, onChange }) {
    {/* TODO: Add backend connection to admin where whatever topics admin adds will show up */}
  const topics = ["Arrays", "Strings", "Linked Lists", "Trees", "Graphs", "Dynamic Programming", "Math"];
  return (
    <div className="text-center">
      <p className="text-gray-600 mb-2 text-[20px]">Select your topic</p>
      <div className="inline-block w-[320px]">
        <select
          value={value}
          onChange={(e)=>onChange(e.target.value)}
          className="w-full rounded-2xl bg-[#68659A] text-white font-bold px-4 py-3
                     focus:ring-2 focus:ring-[#4A53A7] outline-none"
        >
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}
