import { useState, useEffect, useRef } from "react";

export default function ChatPanel({ chatMessages, sendChatMessage, username }) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  // Auto scroll to latest message
  useEffect(() => {
    const container = chatEndRef.current?.parentElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendChatMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 p-2">
        {/* Static welcome */}
        <div className="text-center text-xs text-gray-500 italic">
          Welcome to the session chat
        </div>

        {chatMessages.map((msg, idx) => {
          const isSystem = msg.type === "system" || msg.username === "system";
          const isSelf = msg.username === username;

          if (isSystem) {
            return (
              <div key={idx} className="text-center">
                <span className="inline-block text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 italic">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={`px-2 py-1 rounded-md max-w-[85%] ${
                isSelf ? "bg-[#D7D6E6]/80 self-end ml-auto" : "bg-gray-100 self-start mr-auto"
              } break-words`}
            >
              <div className="text-xs font-semibold text-gray-700">{msg.username}</div>
              <div className="text-sm">{msg.text}</div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="mt-auto border-t pt-2 flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(e)}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5F5699]"
        />
        <button
          onClick={handleSend}
          className="bg-[#5F5699] hover:bg-[#5F5699]/90 text-white px-3 py-2 rounded-lg text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
