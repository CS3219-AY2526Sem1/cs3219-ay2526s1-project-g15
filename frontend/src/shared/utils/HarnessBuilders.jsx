// harnessbuilder.js

// NEW: pull in relaxed args helper
import { toArgsFromRelaxed } from "./ioFormat";

/**
 * Extract function name from question title
 * "Two Sum" -> "twoSum", "Linked List Cycle" -> "linkedListCycle"
 */
function getFunctionName(title) {
  const parts = (title || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, "");
      if (!clean) return "";
      return index === 0
        ? clean.charAt(0).toLowerCase() + clean.slice(1)
        : clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .filter(Boolean);

  let fn = parts.join("");

  if (/^[0-9]/.test(fn)) fn = "solve" + fn;
  if (!fn) fn = "solution";
  return fn;
}

/**
 * Generate topic-specific helper code
 */
function getPreludeForTopics(topics, lang) {
  const hasLinkedList = topics.some(t => t.toLowerCase().includes("linked list"));
  const hasBinaryTree = topics.some(t =>
    t.toLowerCase().includes("binary tree") || t.toLowerCase().includes("tree")
  );

  if (lang === "javascript" || lang === "typescript") {
    let prelude = "";
    if (hasLinkedList) {
      prelude += `
class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}
function buildLinkedList(arr, pos = -1) {
  if (!arr.length) return null;
  const head = new ListNode(arr[0]);
  let current = head; const nodes = [head];
  for (let i = 1; i < arr.length; i++) { current.next = new ListNode(arr[i]); current = current.next; nodes.push(current); }
  if (pos >= 0 && pos < nodes.length) current.next = nodes[pos];
  return head;
}
`;
    }
    if (hasBinaryTree) {
      prelude += `
class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}
function buildTree(arr) {
  if (!arr.length || arr[0] === null) return null;
  const root = new TreeNode(arr[0]); const queue = [root]; let i = 1;
  while (queue.length && i < arr.length) {
    const node = queue.shift();
    if (i < arr.length && arr[i] !== null) { node.left = new TreeNode(arr[i]); queue.push(node.left); }
    i++;
    if (i < arr.length && arr[i] !== null) { node.right = new TreeNode(arr[i]); queue.push(node.right); }
    i++;
  }
  return root;
}
`;
    }
    return prelude;
  }

  if (lang === "python") {
    let prelude = "";
    if (hasLinkedList) {
      prelude += `
class ListNode:
    def __init__(self, val=0, next=None): self.val = val; self.next = next
def build_linked_list(arr, pos=-1):
    if not arr: return None
    head = ListNode(arr[0]); current = head; nodes = [head]
    for i in range(1, len(arr)):
        current.next = ListNode(arr[i]); current = current.next; nodes.append(current)
    if 0 <= pos < len(nodes): current.next = nodes[pos]
    return head
`;
    }
    if (hasBinaryTree) {
      prelude += `
class TreeNode:
    def __init__(self, val=0, left=None, right=None): self.val = val; self.left = left; self.right = right
def build_tree(arr):
    if not arr or arr[0] is None: return None
    root = TreeNode(arr[0]); queue = [root]; i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None: node.left = TreeNode(arr[i]); queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None: node.right = TreeNode(arr[i]); queue.append(node.right)
        i += 1
    return root
`;
    }
    return prelude;
  }

  if (lang === "java") {
    let prelude = "";
    if (hasLinkedList) {
      prelude += `
class ListNode { int val; ListNode next; ListNode(int x) { val = x; } }
class Builders {
    public static ListNode buildLinkedList(int[] arr, int pos) {
        if (arr.length == 0) return null;
        ListNode head = new ListNode(arr[0]), current = head;
        ListNode[] nodes = new ListNode[arr.length]; nodes[0] = head;
        for (int i = 1; i < arr.length; i++) { current.next = new ListNode(arr[i]); current = current.next; nodes[i] = current; }
        if (pos >= 0 && pos < arr.length) current.next = nodes[pos];
        return head;
    }
}
`;
    }
    if (hasBinaryTree) {
      prelude += `
class TreeNode { int val; TreeNode left; TreeNode right; TreeNode(int x) { val = x; } }
`;
    }
    return prelude;
  }

  return "";
}

function buildHarnessJSorTS(src, question) {
  const functionName = getFunctionName(question.title);
  const prelude = getPreludeForTopics(question.topics || [], "javascript");
  const testCases = question.test_cases || [];

  // Convert test_cases to args arrays: {"nums":[2,7], "target":9} -> [[2,7], 9]
  const argsArrays = testCases.map((tc) => {
    if (typeof tc.input === "string") {
      // CHANGED: accept relaxed non-JSON inputs
      const args = toArgsFromRelaxed(tc.input);
      return args.length ? args : [tc.input]; // fallback as raw string
    }
    if (!tc.input || typeof tc.input !== "object") return [];
    if (Array.isArray(tc.input)) return tc.input;
    return Object.values(tc.input);
  });

  const serialized = JSON.stringify(argsArrays);

  return `
// ==== Auto-generated helper code ====
${prelude}

// ==== Your Code ====
${src}

// ==== Test Harness ====
const __tests = ${serialized};
for (let i = 0; i < __tests.length; i++) {
  const args = __tests[i];
  try {
    const __out = ${functionName}(...args);
    console.log(JSON.stringify({ case: i + 1, out: __out }));
  } catch (e) {
    console.log(JSON.stringify({ case: i + 1, error: String(e) }));
  }
}
`;
}

function buildHarnessPy(src, question) {
  const functionName = getFunctionName(question.title);
  const prelude = getPreludeForTopics(question.topics || [], "python");
  const testCases = question.test_cases || [];

  const argsArrays = testCases.map((tc, idx) => {
    if (typeof tc.input === "string") {
      // CHANGED: accept relaxed non-JSON inputs
      const args = toArgsFromRelaxed(tc.input);
      return args.length ? args : [];
    }
    if (!tc.input || typeof tc.input !== "object") return [];
    if (Array.isArray(tc.input)) return tc.input;
    return Object.values(tc.input);
  });

  const serialized = JSON.stringify(argsArrays)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

  return `
# ==== Auto-generated helper code ====
${prelude}

# ==== Your Code ====
${src}

# ==== Test Harness ====
import json
__tests = json.loads('${serialized}')
for i, args in enumerate(__tests):
    try:
        __out = ${functionName}(*args)
        print(json.dumps({"case": i+1, "out": __out}))
    except Exception as e:
        print(json.dumps({"case": i+1, "error": str(e)}))
`;
}

function buildHarnessJava(src, question) {
  const functionName = getFunctionName(question.title);
  const prelude = getPreludeForTopics(question.topics || [], "java");
  const testCases = question.test_cases || [];

  const javaCases = testCases.map((tc, i) => {
    // CHANGED: allow string inputs via relaxed parse; arrays/objects still work
    let inputValues, inputKeys;

    if (typeof tc.input === "string") {
      const args = toArgsFromRelaxed(tc.input); // ordered array of args
      inputValues = args;
      inputKeys = args.map((_, idx) => `arg${idx + 1}`);
    } else if (Array.isArray(tc.input)) {
      inputValues = tc.input;
      inputKeys = tc.input.map((_, idx) => `arg${idx + 1}`);
    } else if (tc.input && typeof tc.input === "object") {
      inputValues = Object.values(tc.input);
      inputKeys = Object.keys(tc.input);
    } else {
      return "";
    }

    const declarations = inputValues.map((val, idx) => {
      const paramName = inputKeys[idx];
      if (Array.isArray(val)) {
        const isNum = val.every(v => typeof v === "number");
        const arrType = isNum ? "int" : "String";
        const arrValues = val.map(v => (typeof v === "string" ? `"${v}"` : v)).join(", ");
        return `${arrType}[] ${paramName} = new ${arrType}[]{ ${arrValues} };`;
      } else if (typeof val === "string") {
        return `String ${paramName} = "${val}";`;
      } else if (typeof val === "boolean") {
        return `boolean ${paramName} = ${val};`;
      } else if (val === null) {
        // Java needs a type; default to String for nulls
        return `String ${paramName} = null;`;
      } else {
        // default numeric as int (extend if you support doubles/longs)
        return `int ${paramName} = ${val};`;
      }
    }).join("\n        ");

    const callArgs = inputKeys.join(", ");

    return `
      {
        ${declarations}
        Object out = new Solution().${functionName}(${callArgs});
        System.out.println("{\\"case\\":${i+1},\\"out\\":"+out+"}");
      }`;
  }).join("\n");

  return `
// ==== Auto-generated helper code ====
${prelude}

// ==== Your Code ====
${src}

// ==== Test Harness (Main) ====
public class Main {
  public static void main(String[] args) {
    try {
${javaCases}
    } catch (Exception e) {
      System.out.println("{\\"error\\":\\""+e.toString().replace("\\\\", "\\\\\\\\").replace("\\"","\\\\\\"")+"\\\\"}");
    }
  }
}
`;
}

function buildHarness(src, lang, question) {
  if (!question || !question.test_cases) {
    throw new Error("Invalid question format: missing test_cases");
  }
  if (!Array.isArray(question.test_cases)) {
    throw new Error("test_cases must be an array");
  }
  if (question.test_cases.length === 0) {
    throw new Error("No test cases provided");
  }

  if (lang === "javascript" || lang === "typescript") return buildHarnessJSorTS(src, question);
  if (lang === "python") return buildHarnessPy(src, question);
  if (lang === "java") return buildHarnessJava(src, question);
  return src; // fallback
}

export { getFunctionName, buildHarnessJSorTS, buildHarnessPy, buildHarnessJava, buildHarness };
