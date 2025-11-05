export const LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
};

export const filenameByLang = (lang) =>
    ({ javascript: "index.js", python: "main.py" }[lang] || "main.txt");
