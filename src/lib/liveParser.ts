// Parses a plain-text ladder into 15 structured questions.
//
// Accepted per-question format (blank line between questions):
//
//   1. What is 2 + 2?
//   A) 3
//   B) 4
//   C) 5
//   D) 6
//   Correct: B
//   Prize: 100          (optional — falls back to DEFAULT_PRIZE_LADDER[i])
//
// - The leading "1." / "Q1:" / "Question 1)" is optional.
// - Choice lines may use "A)", "A.", "A -", "(A)" etc.
// - "Correct:" may be "Answer:", "Ans:", "Correct answer:"; value is A|B|C|D or the full choice text.
// - Blank lines separate questions; extra whitespace is tolerated.

import { LIVE_PRIZE_LADDER } from './constants';

export interface ParsedLadderQuestion {
  order_index: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: 'A' | 'B' | 'C' | 'D';
  prize_amount: number;
}

export interface ParseResult {
  questions: ParsedLadderQuestion[];
  errors: string[];
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'] as const;

function stripQuestionPrefix(line: string): string {
  return line
    .replace(/^\s*(?:q(?:uestion)?\s*)?\d+\s*[.:)\-]\s*/i, '')
    .replace(/^\s*q\s*[.:)\-]\s*/i, '')
    .trim();
}

function matchChoice(line: string): { letter: 'A' | 'B' | 'C' | 'D'; text: string } | null {
  const m = line.match(/^\s*\(?([A-Da-d])\)?\s*[.):\-]\s*(.+)$/);
  if (!m) return null;
  return { letter: m[1].toUpperCase() as 'A' | 'B' | 'C' | 'D', text: m[2].trim() };
}

function matchCorrect(line: string): string | null {
  const m = line.match(/^\s*(?:correct(?:\s*answer)?|answer|ans)\s*[:=\-]\s*(.+)$/i);
  return m ? m[1].trim() : null;
}

function matchPrize(line: string): number | null {
  const m = line.match(/^\s*(?:prize|reward|amount|value)\s*[:=\-]\s*([\d,._]+)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/[,_\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export function parseLadder(text: string): ParseResult {
  const errors: string[] = [];
  // Split into blocks on blank lines
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const questions: ParsedLadderQuestion[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;

    const choices: Record<'A' | 'B' | 'C' | 'D', string | undefined> = {
      A: undefined, B: undefined, C: undefined, D: undefined,
    };
    let correctRaw: string | null = null;
    let prize: number | null = null;
    const questionLines: string[] = [];

    for (const rawLine of lines) {
      const ch = matchChoice(rawLine);
      if (ch && choices[ch.letter] === undefined) { choices[ch.letter] = ch.text; continue; }
      const corr = matchCorrect(rawLine);
      if (corr && correctRaw === null) { correctRaw = corr; continue; }
      const pz = matchPrize(rawLine);
      if (pz !== null && prize === null) { prize = pz; continue; }
      questionLines.push(rawLine);
    }

    const questionText = stripQuestionPrefix(questionLines.join(' ')).trim();
    if (!questionText) {
      errors.push(`Question ${idx + 1}: missing question text`);
      return;
    }
    for (const l of CHOICE_LETTERS) {
      if (!choices[l]) errors.push(`Question ${idx + 1}: missing choice ${l}`);
    }
    if (!correctRaw) {
      errors.push(`Question ${idx + 1}: missing "Correct:" line`);
    }

    let correct: 'A' | 'B' | 'C' | 'D' | null = null;
    if (correctRaw) {
      const upper = correctRaw.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(upper)) {
        correct = upper as 'A' | 'B' | 'C' | 'D';
      } else {
        // Try to match by choice text
        for (const l of CHOICE_LETTERS) {
          if (choices[l] && choices[l]!.toLowerCase() === correctRaw.toLowerCase()) {
            correct = l;
            break;
          }
        }
        if (!correct) errors.push(`Question ${idx + 1}: correct "${correctRaw}" doesn't match A/B/C/D`);
      }
    }

    if (correct && choices.A && choices.B && choices.C && choices.D) {
      questions.push({
        order_index: questions.length,
        question: questionText,
        choice_a: choices.A!,
        choice_b: choices.B!,
        choice_c: choices.C!,
        choice_d: choices.D!,
        correct_choice: correct,
        prize_amount: prize ?? LIVE_PRIZE_LADDER[questions.length]?.prizeAmount ?? 0,
      });
    }
  });

  if (questions.length !== 15 && errors.length === 0) {
    errors.push(`Expected 15 questions, parsed ${questions.length}. Separate questions with a blank line.`);
  }

  // Re-index in case
  questions.forEach((q, i) => { q.order_index = i; });

  return { questions, errors };
}

export const EXAMPLE_LADDER = `1. What is the capital of France?
A) Berlin
B) Madrid
C) Paris
D) Rome
Correct: C

2. 2 + 2 = ?
A) 3
B) 4
C) 5
D) 22
Correct: B
`;
