// ---- Pretty Printers (unchanged) ----
export function prettyPrintInput(input) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return Object.entries(input)
      .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
      .join("\n");
  }
  return JSON.stringify(input, null, 2);
}

export function prettyPrintOutput(out) {
  return typeof out === "string" ? out : JSON.stringify(out, null, 2);
}

export function prettifyIfParsable(str) {
  if (typeof str !== "string") return str;
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, 2);
  } catch {}
  const relaxed = parseRelaxed(str);
  if (relaxed !== null) return JSON.stringify(relaxed, null, 2);
  return str; // leave as-is
}

// ---- Relaxed parser: JSON OR "a=[1,2], b=9" (upgraded) ----
export function parseRelaxed(str) {
  if (!str || typeof str !== "string") return null;

  // Keep an original for fallback attempts
  const original = str.trim();

  // 1) Try strict JSON first
  try { return JSON.parse(original); } catch {}

  // 2) Normalize simple arrays/primitives: single quotes, trailing commas
  {
    let t = original;

    // Is it array/primitive-like?
    const looksSimple =
      /^\[.*\]$/.test(t) || /^'.*'$/.test(t) || /^".*"$/.test(t) ||
      /^(true|false|null|-?\d+(\.\d+)?([eE][+-]?\d+)?)$/.test(t);

    if (looksSimple) {
      // 'abc' -> "abc"
      t = t.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`);
      // [1,2,] -> [1,2]
      t = t.replace(/,\s*]/g, "]");
      try { return JSON.parse(t); } catch {}
    }
  }

  // 3) Assignment-style: allow newlines and commas as separators
  //    Convert "x = 1, y = [2,3]" → object
  const s = original.replace(/\n+/g, ",");

  // Split on top-level commas
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);

  if (!parts.length) return null;

  const obj = {};
  for (let p of parts) {
    if (!p.trim()) continue;
    // Support both "k = v" and "k: v"
    let sepIdx = p.indexOf("=");
    if (sepIdx === -1) sepIdx = p.indexOf(":");
    if (sepIdx === -1) return null;

    const key = p.slice(0, sepIdx).trim();
    const val = p.slice(sepIdx + 1).trim();
    if (!key) return null;

    try {
      if ((val.startsWith("[") && val.endsWith("]")) || (val.startsWith("{") && val.endsWith("}"))) {
        obj[key] = JSON.parse(
          // normalize single-quoted strings inside
          val.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`)
            .replace(/,\s*([}\]])/g, "$1")
        );
      } else if (!Number.isNaN(Number(val))) {
        obj[key] = Number(val);
      } else if (val === "true" || val === "false") {
        obj[key] = (val === "true");
      } else if (val === "null") {
        obj[key] = null;
      } else if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        obj[key] = val.slice(1, -1);
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  return Object.keys(obj).length ? obj : null;
}

// ---- Helper: turn relaxed input into ordered args array ----
export function toArgsFromRelaxed(input) {
  const parsed = parseRelaxed(input);
  if (parsed === null || parsed === undefined) return [];
  if (Array.isArray(parsed)) return [parsed];        // single-arg: the array
  if (typeof parsed === "object") return Object.values(parsed); // preserve insertion order
  return [parsed];                                   // primitive -> single arg
}
