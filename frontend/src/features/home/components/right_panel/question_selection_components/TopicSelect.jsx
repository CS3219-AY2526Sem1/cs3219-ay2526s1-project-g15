export default function TopicSelect({ value, onChange, topics, completedTopics = [], availableTopics }) {
  const isCompleted = (t) => completedTopics.includes(t);
  const isAvailable = (t) => availableTopics.includes(t);

  return (
    <div className="text-center">
      <p className="text-gray-600 mb-2 text-[20px]">Select your topic</p>
      <div className="inline-block w-[320px]">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl bg-[#68659A] text-white font-bold px-4 py-3
                     focus:ring-2 focus:ring-[#4A53A7] outline-none"
          aria-describedby="topic-help">
          {topics.map((t) => {
            const completed = isCompleted(t);
            const available = isAvailable(t);
            
            return (
              <option
                key={t}
                value={t}
                disabled={completed || !available}
                style={!available && !completed ? { color: '#999' } : {}}>
                {t} {completed ? "(completed)" : ""}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}