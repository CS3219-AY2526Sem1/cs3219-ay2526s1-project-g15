export const LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
};

export const filenameByLang = (lang) =>
    ({ javascript: "index.js", typescript: "index.ts", python: "main.py",
       java: "Main.java", cpp: "main.cpp", csharp: "Program.cs" }[lang] || "main.txt");

export const PROBLEM_SPEC = {
  fn: { name: "hasCycle", params: ["head"] },
  // Represent linked list inputs as a small JSON schema; pos is cycle entry index or -1
  tests: [
    { args: [{ kind: "ll", arr: [3,2,0,-4], pos: 1 }], expected: true },
    { args: [{ kind: "ll", arr: [1,2], pos: 0 }], expected: true },
    { args: [{ kind: "ll", arr: [1], pos: -1 }], expected: false },
  ],
  // per-language helper code to build/deserialize inputs
  preludes: {
    javascript: `
class ListNode {
  constructor(val){ this.val = val; this.next = null; }
}
function buildLinkedList(arr, pos){
  if(!arr.length) return null;
  const nodes = arr.map(v=>new ListNode(v));
  for(let i=0;i<nodes.length-1;i++) nodes[i].next = nodes[i+1];
  if(pos>=0) nodes[nodes.length-1].next = nodes[pos];
  return nodes[0];
}
function deserializeArg(arg){
  if (arg && arg.kind === "ll") return buildLinkedList(arg.arr, arg.pos);
  return arg;
}
    `,
    typescript: `
class ListNode {
  val: number; next: ListNode | null;
  constructor(val:number){ this.val = val; this.next = null; }
}
function buildLinkedList(arr:number[], pos:number): ListNode | null {
  if(!arr.length) return null;
  const nodes = arr.map(v=>new ListNode(v));
  for(let i=0;i<nodes.length-1;i++) nodes[i].next = nodes[i+1];
  if(pos>=0) nodes[nodes.length-1]!.next = nodes[pos]!;
  return nodes[0]!;
}
function deserializeArg(arg:any): any {
  if (arg && arg.kind === "ll") return buildLinkedList(arg.arr, arg.pos);
  return arg;
}
    `,
    python: `
class ListNode:
    def __init__(self, x):
        self.val = x
        self.next = None

def buildLinkedList(arr, pos):
    if not arr: return None
    nodes = [ListNode(v) for v in arr]
    for i in range(len(nodes)-1):
        nodes[i].next = nodes[i+1]
    if pos >= 0:
        nodes[-1].next = nodes[pos]
    return nodes[0]

def deserialize_arg(arg):
    if isinstance(arg, dict) and arg.get("kind") == "ll":
        return buildLinkedList(arg["arr"], arg["pos"])
    return arg
    `,
    // NOTE (Java): require users to implement `class Solution { public boolean hasCycle(ListNode head) { ... } }`
    java: `
import java.util.*;

class ListNode {
  int val; ListNode next;
  ListNode(int x){ val = x; next = null; }
}
class Builders {
  static ListNode buildLinkedList(int[] arr, int pos){
    if(arr.length==0) return null;
    ListNode[] nodes = new ListNode[arr.length];
    for(int i=0;i<arr.length;i++) nodes[i] = new ListNode(arr[i]);
    for(int i=0;i<arr.length-1;i++) nodes[i].next = nodes[i+1];
    if(pos>=0) nodes[arr.length-1].next = nodes[pos];
    return nodes[0];
  }
}
    `,
  }
};
