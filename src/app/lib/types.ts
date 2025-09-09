export type OptionKey = "A" | "B" | "C" | "D";

export type QuizOption = Record<OptionKey, string>;

export type QuizQuestion = {
  id: number;
  question: string;
  options: QuizOption;
  answer: OptionKey;
  explanation: string;
};
