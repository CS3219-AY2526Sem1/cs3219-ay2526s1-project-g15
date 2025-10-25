export default function ProblemPanel({ className = "" }) {
  return (
    <aside className={`w-full lg:w-[340px] rounded-2xl bg-[#5F5699] text-white p-6 shadow border border-white/10 ${className}`}>
      {/* TODO: change to question in the backend */}
      <h2 className="text-lg font-bold mb-2">1. Linked List Cycle</h2>

      <div className="flex gap-2 mb-4">
        {/* TODO: change it to whatever the user chose as their topic and difficulty level that was sent to backend*/}
        <span className="px-3 py-1 rounded-full bg-white/15">Arrays</span>
        <span className="px-3 py-1 rounded-full bg-white/15">Medium</span>
      </div>

      {/* TODO: change question to whatever is in the backend that matches whatever the user selected*/}
      <p className="text-white/90 text-sm leading-relaxed">
        Given head, the head of a linked list, determine if the linked list has a cycle in it.
        A cycle exists if some node can be reached again by following next pointers. Return true
        if there is a cycle, else false. <br/><br/>
        Internally, <code className="bg-white/10 px-1 rounded">pos</code> denotes the index of the node that tail’s next pointer connects to (not passed as a parameter).
      </p>

      <div className="mt-6 space-y-4 text-sm">
        <div>
          <p className="font-semibold mb-1">Example 1:</p>
          <p>Input: head = [3,2,0,-4], pos = 1</p>
          <p>Output: true</p>
          <p className="text-white/80">Explanation: cycle connects to index 1.</p>
        </div>
        <div>
          <p className="font-semibold mb-1">Example 2:</p>
          <p>Input: head = [1,2], pos = 0</p>
          <p>Output: true</p>
        </div>
        <div>
          <p className="font-semibold mb-1">Example 3:</p>
          <p>Input: head = [1], pos = -1</p>
          <p>Output: false</p>
        </div>
      </div>
    </aside>
  );
}
