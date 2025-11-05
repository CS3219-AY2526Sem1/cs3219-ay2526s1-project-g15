// harnessbuilder.js

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
 * Generate helper classes for data structures
 * Users can call these in their code to build test data
 */
function getPreludeForTopics(topics, lang) {
  const hasLinkedList = topics.some((t) => t.toLowerCase().includes("linked list"));
  const hasBinaryTree = topics.some((t) =>
    t.toLowerCase().includes("binary tree") || t.toLowerCase().includes("tree")
  );

  if (lang === "javascript") {
    let prelude = "";
    if (hasLinkedList) {
      // define these only if user/code hasn't already defined them
      prelude += `
if (typeof globalThis.ListNode === "undefined") {
  globalThis.ListNode = class ListNode {
    constructor(val, next = null) { this.val = val; this.next = next; }
  };
}

if (typeof globalThis.buildLinkedList === "undefined") {
  globalThis.buildLinkedList = function (arr, pos = -1) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const head = new globalThis.ListNode(arr[0]);
    let current = head;
    const nodes = [head];
    for (let i = 1; i < arr.length; i++) {
      current.next = new globalThis.ListNode(arr[i]);
      current = current.next;
      nodes.push(current);
    }
    if (typeof pos === "number" && pos >= 0 && pos < nodes.length) {
      current.next = nodes[pos];
    }
    return head;
  };
}

if (typeof globalThis.listToArray === "undefined") {
  globalThis.listToArray = function (head) {
    const result = [];
    let current = head;
    const seen = new Set();
    while (current && !seen.has(current)) {
      result.push(current.val);
      seen.add(current);
      current = current.next;
    }
    return result;
  };
}
`;
    }
    if (hasBinaryTree) {
      prelude += `
if (typeof globalThis.TreeNode === "undefined") {
  globalThis.TreeNode = class TreeNode {
    constructor(val, left = null, right = null) { 
      this.val = val; 
      this.left = left; 
      this.right = right; 
    }
  };
}

if (typeof globalThis.buildTree === "undefined") {
  globalThis.buildTree = function (arr) {
    if (!Array.isArray(arr) || arr.length === 0 || arr[0] === null) return null;
    const root = new globalThis.TreeNode(arr[0]);
    const queue = [root];
    let i = 1;
    while (queue.length && i < arr.length) {
      const node = queue.shift();
      if (i < arr.length && arr[i] !== null) {
        node.left = new globalThis.TreeNode(arr[i]);
        queue.push(node.left);
      }
      i++;
      if (i < arr.length && arr[i] !== null) {
        node.right = new globalThis.TreeNode(arr[i]);
        queue.push(node.right);
      }
      i++;
    }
    return root;
  };
}
`;
    }
    return prelude;
  }

  // python branch stays the same
  if (lang === "python") {
    let prelude = "";
    if (hasLinkedList) {
      prelude += `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_linked_list(arr, pos=-1):
    if not isinstance(arr, list) or not arr:
        return None
    head = ListNode(arr[0])
    current = head
    nodes = [head]
    for i in range(1, len(arr)):
        current.next = ListNode(arr[i])
        current = current.next
        nodes.append(current)
    if isinstance(pos, int) and 0 <= pos < len(nodes):
        current.next = nodes[pos]
    return head

def list_to_array(head):
    result = []
    current = head
    seen = set()
    while current and id(current) not in seen:
        result.append(current.val)
        seen.add(id(current))
        current = current.next
    return result
`;
    }
    if (hasBinaryTree) {
      prelude += `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(arr):
    if not isinstance(arr, list) or not arr or arr[0] is None:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root
`;
    }
    return prelude;
  }

  return "";
}


/**
 * Parse test case inputs from various formats
 */
function parseTestCaseInput(tc) {
  // Case 1: String input
  if (typeof tc.input === "string") {
    const trimmed = tc.input.trim();
    
    // If it looks like JSON array/object notation, parse it
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      const args = toArgsFromRelaxed(tc.input);
      return args && args.length ? args : [];
    }
    
    // Otherwise, treat it as a single string argument
    return [tc.input];
  }

  // Case 2: Not an object or missing
  if (!tc.input || typeof tc.input !== "object") return [];

  // Case 3: Already an array
  if (Array.isArray(tc.input)) return tc.input;

  // Case 4: Object with values that might be JSON strings
  const parsedValues = Object.values(tc.input).map((val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  });
  return parsedValues;
}

function buildHarnessJSorTS(src, question) {
  const functionName = getFunctionName(question.title);
  const prelude = getPreludeForTopics(question.topics || [], "javascript");
  const testCases = question.test_cases || [];

  const argsArrays = testCases.map(parseTestCaseInput);
  const serialized = JSON.stringify(argsArrays);

  return `
// ==== Helper Classes & Functions ====
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

  const argsArrays = testCases.map(parseTestCaseInput);
  const serialized = JSON.stringify(argsArrays)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

  return `
# ==== Helper Classes & Functions ====
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

  if (lang === "javascript") return buildHarnessJSorTS(src, question);
  if (lang === "python") return buildHarnessPy(src, question);
  return src;
}

export { getFunctionName, buildHarnessJSorTS, buildHarnessPy, buildHarness };