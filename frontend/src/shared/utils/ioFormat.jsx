// makes values look nice on the frontend
export function formatScalarDisplay(val) {
  if (val == null) return "null";

  // numbers / booleans
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }

  // arrays 
  if (Array.isArray(val)) {
    return `[${val.map((item) => formatScalarDisplay(item)).join(", ")}]`;
  }

  // strings might be JSON or plain
  if (typeof val === "string") {
    const trimmed = val.trim();
    // try strict JSON
    try {
      const parsed = JSON.parse(trimmed);
      return formatScalarDisplay(parsed);
    } catch {
      // if not JSON
    }
    // if it already looks like array/object, show as it is
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      return trimmed;
    }
    return trimmed;
  }

  // plain object (fallback)
  if (typeof val === "object") {
    return JSON.stringify(val);
  }

  return String(val);
}

export function prettyPrintInput(input) {
  // object (not array) --> key = value per line
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return Object.entries(input)
      .map(([k, v]) => `${k} = ${formatScalarDisplay(v)}`)
      .join("\n");
  }
  // everything else --> nice scalar display
  return formatScalarDisplay(input);
}

export function prettyPrintOutput(out) {
  // outputs are often simple — still run through the nicer display
  return formatScalarDisplay(out);
}

// tries to parse strings like JSON or things like "a=[1,2], b=9"
// then returns the pretty version, not raw JSON.stringify
export function prettifyIfParsable(str) {
  if (typeof str !== "string") return str;
  const trimmed = str.trim();

  // try strict JSON
  try {
    const parsed = JSON.parse(trimmed);
    return formatScalarDisplay(parsed);
  } catch {}

  // try relaxed
  const relaxed = parseRelaxed(trimmed);
  if (relaxed !== null) return prettyPrintInput(relaxed);

  // leave as-is
  return str;
}

// JSON or "a=[1,2], b=9" 
export function parseRelaxed(str) {
  if (!str || typeof str !== "string") return null;

  // Keep original for fallback attempts
  const original = str.trim();

  // Try strict JSON first
  try {
    return JSON.parse(original);
  } catch {}

  // Normalize simple arrays/primitives: single quotes, trailing commas
  {
    let t = original;

    // Is it array/primitive-like?
    const looksSimple =
      /^\[.*\]$/.test(t) ||
      /^'.*'$/.test(t) ||
      /^".*"$/.test(t) ||
      /^(true|false|null|-?\d+(\.\d+)?([eE][+-]?\d+)?)$/.test(t);

    if (looksSimple) {
      // 'abc' -> "abc"
      t = t.replace(
        /'([^'\\]*(\\.[^'\\]*)*)'/g,
        (_, inner) => `"${inner.replace(/"/g, '\\"')}"`
      );
      // [1,2,] -> [1,2]
      t = t.replace(/,\s*]/g, "]");
      try {
        return JSON.parse(t);
      } catch {}
    }
  }

  // allow newlines and commas as separators
  const s = original.replace(/\n+/g, ",");

  // Split on top-level commas
  const parts = [];
  let depth = 0,
    cur = "";
  for (const ch of s) {
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
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
      if (
        (val.startsWith("[") && val.endsWith("]")) ||
        (val.startsWith("{") && val.endsWith("}"))
      ) {
        obj[key] = JSON.parse(
          // normalise single-quoted strings inside
          val
            .replace(
              /'([^'\\]*(\\.[^'\\]*)*)'/g,
              (_, inner) => `"${inner.replace(/"/g, '\\"')}"`
            )
            .replace(/,\s*([}\]])/g, "$1")
        );
      } else if (!Number.isNaN(Number(val))) {
        obj[key] = Number(val);
      } else if (val === "true" || val === "false") {
        obj[key] = val === "true";
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

// turn relaxed input into ordered args array 
export function toArgsFromRelaxed(input) {
  const parsed = parseRelaxed(input);
  if (parsed === null || parsed === undefined) return [];
  if (Array.isArray(parsed)) return [parsed];
  if (typeof parsed === "object") return Object.values(parsed); // preserve insertion order
  return [parsed]; 
}
