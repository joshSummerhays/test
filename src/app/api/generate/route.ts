import { NextResponse } from "next/server";
import OpenAI from "openai";
import { parseQuizFromText } from "../../lib/parseOpenAI";
import type { QuizQuestion } from "../../lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = (body.topic || "").toString().trim();

    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured on the server (OPENAI_API_KEY)" },
        { status: 500 }
      );
    }

    const userMessage = `Create a high-quality 5-question multiple-choice quiz about "${topic}". Follow these requirements EXACTLY:

    1) Each question must be formatted as shown in these examples (adjust content but keep this exact style):

    DEFINITION QUESTION:
    {
    "id": 1,
    "question": "What is photosynthesis?",
    "options": {
        "A": "The process of plants converting light energy into chemical energy",
        "B": "The breakdown of glucose to release energy",
        "C": "The movement of water through plant stems",
        "D": "The exchange of gases through leaf stomata"
    },
    "answer": "A",
    "explanation": "Photosynthesis is specifically the conversion of light into chemical energy, while the other options describe different plant processes (respiration, transpiration, and gas exchange)."
    }

    APPLICATION QUESTION:
    {
    "id": 2,
    "question": "Which scenario best demonstrates photosynthesis in action?",
    "options": {
        "A": "A plant wilting in darkness",
        "B": "Roots growing deeper into soil",
        "C": "Leaves turning toward sunlight to capture energy",
        "D": "Seeds dispersing in the wind"
    },
    "answer": "C",
    "explanation": "Leaves turning toward sunlight directly demonstrates photosynthesis in action, as the plant optimizes its light capture for energy production, while the other options show unrelated plant behaviors."
    }

    2) For your 5 questions about ${topic}, include: 
    - 1 clear definition/concept question 
    - 1 practical application/example question 
    - 1 comparison/distinction question 
    - 1 cause-and-effect question 
    - 1 common misconception question 

    3) Every question MUST:
    - Have exactly one correct answer
    - Include 3 plausible but incorrect options
    - Avoid vague qualifiers like "sometimes" or "maybe"
    - Keep all options similar in length and style
    - Include a specific explanation that mentions why the correct answer is right and others are wrong

    4) Format requirements:
    - Return only pure JSON with no other text
    - Use exactly this structure: { "questions": [array of 5 question objects] }
    - Each question object needs: id, question, options (A/B/C/D), answer, explanation
    - No "all/none of the above" or compound options
    - Return payload should be an array of objects, not a string`;

   const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
   });

   const resp = await openai.responses.create({
    model: model,
    input: userMessage
    });

    if(resp.error) {
        return NextResponse.json({ error: `OpenAI error` }, { status: 500 });
    }

    // Convert the SDK response output_text into structured questions
    const extracted = parseOutputTextToQuestions(resp.output_text);
    if (!extracted || !Array.isArray(extracted)) {
      // fallback: return local deterministic quiz so client still works
      const fallback = generateLocalQuiz(topic);
      return NextResponse.json({ questions: fallback });
    }

    const questions: QuizQuestion[] = extracted.slice(0, 5).map((q: any, idx: number) => {
       const id = typeof q.id === "number" ? q.id : idx + 1;
       const question = (q.question || "").toString();
       const options = q.options || {};
       const normalizedOptions = {
         A: (options.A || options.a || "").toString(),
         B: (options.B || options.b || "").toString(),
         C: (options.C || options.c || "").toString(),
         D: (options.D || options.d || "").toString(),
       };
       const answerRaw = (q.answer || "").toString().trim().toUpperCase();
       const answer = ["A", "B", "C", "D"].includes(answerRaw) ? (answerRaw as "A" | "B" | "C" | "D") : "A";
       const explanation = (q.explanation || "").toString();
       return { id, question, options: normalizedOptions, answer, explanation };
     });

    return NextResponse.json({ questions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

function generateLocalQuiz(topic: string) {
  // Deterministic simple fallback quiz that doesn't require external APIs.
  // These questions are generic and meant as placeholders when OpenAI isn't available.
  const base = [
    {
      id: 1,
      question: `What is the primary focus of ${topic}?`,
      options: { A: "Definitions and core concepts", B: "Unrelated topic", C: "A specific person's name", D: "A date" },
      answer: "A",
      explanation: `Because ${topic} typically centers on its core definitions and concepts.`,
    },
    {
      id: 2,
      question: `Which of the following is commonly associated with ${topic}?`,
      options: { A: "Completely unrelated item", B: "A commonly associated concept", C: "A random number", D: "An unrelated place" },
      answer: "B",
      explanation: `Option B names a concept that is often discussed alongside ${topic}.`,
    },
    {
      id: 3,
      question: `Why is ${topic} important?`,
      options: { A: "It has no importance", B: "It provides key insights or utility", C: "It is only historical", D: "It is purely fictional" },
      answer: "B",
      explanation: `${topic} is important because it offers insights or practical utility in its domain.`,
    },
    {
      id: 4,
      question: `Which area most directly uses ${topic}?`,
      options: { A: "Directly related field", B: "Completely unrelated field", C: "Fictional field", D: "A historical artifact" },
      answer: "A",
      explanation: `The first option is the field that typically applies ${topic}.`,
    },
    {
      id: 5,
      question: `Which is an example relevant to ${topic}?`,
      options: { A: "An example relevant to the topic", B: "Irrelevant example", C: "Another irrelevant item", D: "Nonsense" },
      answer: "A",
      explanation: `Option A is a reasonable example that relates to ${topic}.`,
    },
  ];

  return base;
}

// Convert raw OpenAI response output_text (or similar) into an array of question objects.
function parseOutputTextToQuestions(outputText: unknown): any[] | null {
  if (!outputText) return null;
  const text = typeof outputText === "string" ? outputText : String(outputText);

  // helper that extracts JSON-like quiz object
  try {
    const parsedViaHelper = parseQuizFromText(text);
    if (parsedViaHelper && Array.isArray(parsedViaHelper.questions)) {
      return parsedViaHelper.questions;
    }
  } catch (e) {
    // ignore and continue
    console.error("parseQuizFromText failed:", e);
  }

  return null;
}
