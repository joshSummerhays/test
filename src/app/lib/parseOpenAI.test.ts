import { describe, it, expect } from "vitest";
import { parseQuizFromText } from "./parseOpenAI";

const sampleQuiz = {
  questions: [
    {
      id: 1,
      question: "What is 2+2?",
      options: { A: "3", B: "4", C: "5", D: "22" },
      answer: "B",
      explanation: "Because 2 plus 2 equals 4.",
    },
  ],
};

describe("parseQuizFromText", () => {
  it("parses a pure JSON string", () => {
    const txt = JSON.stringify(sampleQuiz);
    const parsed = parseQuizFromText(txt);
    expect(parsed).toHaveProperty("questions");
    expect(Array.isArray(parsed!.questions)).toBe(true);
  });

  it("parses a string containing JSON inside other text", () => {
    const wrapped = "Here is the quiz:\n" + JSON.stringify(sampleQuiz) + "\nThanks";
    const parsed = parseQuizFromText(wrapped);
    expect(parsed).not.toBeNull();
    expect(parsed).toHaveProperty("questions");
  });

  it("returns null for text without JSON", () => {
    expect(parseQuizFromText("no json here")).toBeNull();
  });
});
