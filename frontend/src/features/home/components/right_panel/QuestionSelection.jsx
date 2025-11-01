import DifficultyPicker from "./question_selection_components/DifficultyPicker";
import TopicSelect from "./question_selection_components/TopicSelect";

export default function QuestionSelection({
    topic,
    setTopic,
    difficulty,
    setDifficulty,
    topics,
    completedTopics,
    disableStart,
    startSearch,
}) {  
    const topicCompleted = topic && completedTopics.includes(topic);
    const allCompleted = topics.every((t) => completedTopics.includes(t));

    return (
        <>
            <h1 className="text-center text-2xl md:text-3xl font-bold text-[#4A53A7]">
                Let’s code together – click to match!
            </h1>

            <div className="mt-8 space-y-8 flex flex-col items-center">
                <DifficultyPicker value={difficulty} onChange={setDifficulty} />

                <TopicSelect
                value={topic}
                onChange={setTopic}
                topics={topics}
                completedTopics={completedTopics}
                />

                {topicCompleted && (
                <p className="text-sm text-red-600">
                    You’ve completed all questions for <strong>{topic}</strong>. Please choose another topic.
                </p>
                )}

                {/* if everything is completed */}
                {allCompleted && (
                <p className="text-sm text-amber-700 text-center">
                    Yay! You’ve completed every available topic! Check back later for new topics!
                </p>
                )}

                <button
                onClick={startSearch}
                disabled={disableStart}
                className={`mt-2 inline-flex items-center justify-center rounded-2xl
                            text-white text-2xl font-bold px-8 py-3 w-[320px]
                            hover:opacity-95
                            ${disableStart ? "bg-gray-400 cursor-not-allowed" : "bg-[#4A53A7]"}`}
                title={disableStart ? "Please choose a topic you haven't completed" : ""}
                >
                Start Match!
                </button>
            </div>
        </>
    );
}