import { useState } from "react";
import TopNav from "../../../shared/components/TopNav";
import OngoingMeetingCard from "../components/OngoingMeetingCard";
import DifficultyPicker from "../components/DifficultyPicker";
import TopicSelect from "../components/TopicSelect";

export default function Home() {
  // Toggle to demo the sidebar
  const [hasOngoingMeeting, setHasOngoingMeeting] = useState(true); 
  const [difficulty, setDifficulty] = useState("Medium");
  const [topic, setTopic] = useState("Arrays");

  const startMatch = () => {
    alert(`Starting match…\nDifficulty: ${difficulty}\nTopic: ${topic}`);
  };

  const rejoinMeeting = () => {
    alert("Rejoining your ongoing meeting…");
    {/* TODO: Navigate to meeting room once pressed */}
  };

  return (
    <div className="min-h-screen bg-[#D7D6E6]">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar shows ONLY if ongoing */}
          {hasOngoingMeeting && (
            <OngoingMeetingCard onRejoin={rejoinMeeting} />
          )}

          <section className="flex-1 rounded-2xl bg-white p-8 shadow border border-gray-200">
            <h1 className="text-center text-2xl md:text-3xl font-bold text-[#4A53A7]">
              Let’s code together – click to match!
            </h1>

            <div className="mt-8 space-y-8 flex flex-col items-center">
              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
              <TopicSelect value={topic} onChange={setTopic} />

              {/* TODO: Send information to backend once it is up */}
              <button
                onClick={startMatch}
                className="mt-2 inline-flex items-center justify-center rounded-2xl
                           bg-[#4A53A7] text-white text-2xl font-bold px-8 py-3 w-[320px]
                           hover:opacity-95"
              >
                Start Match!
              </button>
            </div>
          </section>
        </div>

        {/* toggle to show/hide ongoing meeting portion. */}
        {/* TODO: Link the ongoing meeting portion to show when there is an ongoing meeting  */}
        <div className="mt-6 text-sm text-gray-500">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasOngoingMeeting}
              onChange={(e)=>setHasOngoingMeeting(e.target.checked)}
            />
            Show “ongoing meeting” sidebar
          </label>
        </div>
      </main>
    </div>
  );
}
