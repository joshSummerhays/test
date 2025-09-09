"use client";

import React, { useState } from "react";
import type { OptionKey, QuizQuestion } from "./lib/types";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, OptionKey | "">>({});
  const [submitted, setSubmitted] = useState(false);

  async function generateQuiz(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!topic.trim()) {
      setError("Please enter a topic to generate a quiz.");
      return;
    }
    setLoading(true);
    setSubmitted(false);
    setQuestions(null);
    setAnswers({});

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate quiz from server");
      }

      const data = await res.json();

      if (!data?.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid response from server");
      }

      setQuestions(data.questions);
      const init: Record<number, OptionKey | ""> = {};
      data.questions.forEach((q: QuizQuestion) => (init[q.id] = ""));
      setAnswers(init);
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(questionId: number, option: OptionKey) {
    if (submitted) return; // don't allow changes after submission
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  function submitQuiz() {
    if (!questions) return;
    setSubmitted(true);
  }

  function resetQuiz() {
    setTopic("");
    setQuestions(null);
    setAnswers({});
    setSubmitted(false);
    setError(null);
  }

  function calculateScore() {
    if (!questions) return 0;
    return questions.reduce((acc, q) => (answers[q.id] === q.answer ? acc + 1 : acc), 0);
  }

  return (
    <div className="min-h-screen p-6 sm:p-12 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Quiz Generator</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Enter a topic and ChatGPT will generate a 5-question multiple choice quiz.
          </p>
        </header>

        <form onSubmit={generateQuiz} className="flex gap-2 items-center mb-4">
          <input
            className="flex-1 rounded-md border px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            placeholder="Enter a topic (e.g. Photosynthesis, JavaScript closures, World War II)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button
            className="rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate Quiz"}
          </button>
          <button
            type="button"
            onClick={resetQuiz}
            className="rounded-md ml-2 border px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          >
            Reset Quiz
          </button>
        </form>

        {error && <div className="text-red-600 mb-4">Error: {error}</div>}

        {questions ? (
          <div className="border rounded-lg p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <div className="max-h-[60vh] overflow-auto">
              {questions.map((q) => (
                <div key={q.id} className="mb-6">
                  <div className="mb-2 font-medium">
                    {q.id}. {q.question}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(Object.keys(q.options) as OptionKey[]).map((optKey) => {
                      const text = q.options[optKey];
                      const isSelected = answers[q.id] === optKey;
                      const showCorrect = submitted && optKey === q.answer;
                      const showIncorrectSelected = submitted && isSelected && optKey !== q.answer;

                      const baseClasses =
                        "flex items-center gap-3 p-2 rounded-md border cursor-pointer";

                      let stateClasses = "bg-transparent border-slate-200 dark:border-slate-700";
                      if (showCorrect) {
                        stateClasses = "bg-green-100 border-green-400";
                      } else if (showIncorrectSelected) {
                        stateClasses = "bg-red-100 border-red-400";
                      }

                      const inputId = `q-${q.id}-${optKey}`;

                      return (
                        <label
                          key={optKey}
                          htmlFor={inputId}
                          className={`${baseClasses} ${stateClasses}`}
                        >
                          <input
                            id={inputId}
                            type="radio"
                            name={`q-${q.id}`}
                            value={optKey}
                            checked={isSelected}
                            onChange={() => handleSelect(q.id, optKey)}
                            disabled={submitted}
                            aria-label={`Question ${q.id} option ${optKey}: ${text}`}
                            className="w-4 h-4"
                          />
                          <div>
                            <div className="font-semibold">{optKey}.</div>
                            <div className="text-sm">{text}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="mt-2 text-sm">
                      <div>
                        <strong>Correct:</strong> {q.answer} — {q.options[q.answer]}
                      </div>
                      <div className="mt-1 text-slate-700 dark:text-slate-300">{q.explanation}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <div>
                {submitted ? (
                  <div className="text-lg font-semibold">Score: {calculateScore()}/{questions.length}</div>
                ) : (
                  <div className="text-sm text-slate-600 dark:text-slate-400">Select answers then submit to see your score.</div>
                )}
              </div>

              <div className="flex gap-2">
                {!submitted && (
                  <button
                    onClick={submitQuiz}
                    className="rounded-md bg-green-600 text-white px-4 py-2 hover:bg-green-700 disabled:opacity-60"
                  >
                    Submit Quiz
                  </button>
                )}

                <button
                  onClick={resetQuiz}
                  className="rounded-md border px-3 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                >
                  Reset Quiz
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-400">No quiz generated yet.</div>
        )}

        <footer className="fixed bottom-10 left-10 mt-8 text-xs text-slate-500">
          Made with &#x2764;
        </footer>
      </div>
    </div>
  );
}
