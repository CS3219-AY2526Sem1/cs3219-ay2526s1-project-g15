// helper function to generate correct language syntax (“the harness”), then call the user’s function with known test inputs,
// print the results, and display them on screen.

/*AI Assistance Disclosure:
Tool: ChatGPT (model: GPT‑5 Thinking), date: 2025‑10‑22
Scope: Generated harnesses for different languages
Author review: I validated correctness, edited for style, and added boundary checks
*/

function buildHarnessJSorTS(src, spec) {
  const { fn, tests, preludes } = spec;
  const prelude = (preludes && preludes.javascript) || preludes?.typescript || "";
  const serialized = JSON.stringify(tests.map(t => t.args));
  return `
// ==== Prelude ====
${prelude}

// ==== User Code ====
${src}

// ==== Test Harness ====
const __tests = ${serialized};
for (let i = 0; i < __tests.length; i++){
  const rawArgs = __tests[i];
  const args = rawArgs.map(deserializeArg);
  try {
    const __out = ${fn.name}(...args);
    // Print one JSON line per case
    console.log(JSON.stringify({case:i+1, out: __out}));
  } catch (e) {
    console.log(JSON.stringify({case:i+1, error: String(e)}));
  }
}
`;
}

function buildHarnessPy(src, spec) {
  const { fn, tests, preludes } = spec;
  const prelude = (preludes && preludes.python) || "";
  const serialized = JSON.stringify(tests.map(t => t.args)).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `
# ==== Prelude ====
${prelude}

# ==== User Code ====
${src}

# ==== Test Harness ====
import json
__tests = json.loads('${serialized}')
for i, raw_args in enumerate(__tests):
    try:
        args = [deserialize_arg(a) for a in raw_args]
        __out = ${fn.name}(*args)
        print(json.dumps({"case": i+1, "out": __out}))
    except Exception as e:
        print(json.dumps({"case": i+1, "error": str(e)}))
`;
}

// Java: expect user defines `class Solution { public boolean hasCycle(ListNode head) { ... } }`
function buildHarnessJava(src, spec) {
  const { fn, tests, preludes } = spec;
  const prelude = (preludes && preludes.java) || "";
  // We’ll bake test args (arrays + pos) into Java
  // tests: [{ args: [{kind:"ll", arr:[...], pos:N}] }, ...]
  const javaCases = spec.tests.map((t, i) => {
    const a = t.args[0]; // only 'head'
    const arr = a.arr.join(", ");
    const pos = a.pos;
    return `
      {
        int[] arr = new int[]{ ${arr} };
        int pos = ${pos};
        ListNode head = Builders.buildLinkedList(arr, pos);
        boolean out = new Solution().${fn.name}(head);
        System.out.println("{\\"case\\":${i+1},\\"out\\":"+out+"}");
      }
    `;
  }).join("\n");

  return `
// ==== Prelude ====
${prelude}

// ==== User Code ====
${src}

// ==== Test Harness (Main) ====
public class Main {
  public static void main(String[] args) {
    try {
${javaCases}
    } catch (Exception e) {
      System.out.println("{\\"error\\":\\""+e.toString().replace("\\\\", "\\\\\\\\").replace("\"","\\\\\\"")+"\\"}");
    }
  }
}
`;
}

function buildHarness(src, lang, spec) {
  if (lang === "javascript" || lang === "typescript") return buildHarnessJSorTS(src, spec);
  if (lang === "python") return buildHarnessPy(src, spec);
  if (lang === "java") return buildHarnessJava(src, spec);
  return src; // fallback
}

export { buildHarnessJSorTS, buildHarnessPy, buildHarnessJava, buildHarness };