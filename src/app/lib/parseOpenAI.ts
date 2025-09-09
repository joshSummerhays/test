export function parseQuizFromText(text: string): { questions?: unknown[] } | null {
  if (!text) return null;

  // Try to parse the whole string first
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return { questions: parsed };
    return parsed as { questions?: unknown[] };
  } catch (err) {
    // Log the initial parse error, then try to extract a JSON object substring
    // eslint-disable-next-line no-console
    console.error("parseQuizFromText: initial JSON.parse failed", err);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      // eslint-disable-next-line no-console
      console.error("parseQuizFromText: no JSON object found in text");
      return null;
    }

    const candidate = text.slice(start, end + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return { questions: parsed };
      return parsed as { questions?: unknown[] };
    } catch (err2) {
      // eslint-disable-next-line no-console
      console.error("parseQuizFromText: failed to parse JSON substring", err2);
      return null;
    }
  }
}
