import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Bot, Copy, ChevronDown, ChevronUp, Check, ExternalLink, ClipboardPaste } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LIVE_PRIZE_LADDER } from '@/lib/constants';
import { cleanAIResponse, parseLadder } from '@/lib/liveParser';

interface AIPromptHelperProps {
  onInsert: (text: string) => void;
}


const PRIZE_LIST = LIVE_PRIZE_LADDER
  .map((p) => `Q${p.questionNumber}: ${p.prizeAmount.toLocaleString()} $JC${p.isSafeHaven ? ' (safe haven)' : ''}`)
  .join('\n');

function buildPrompt(topic: string): string {
  const guide = topic.trim() || '<describe your topic, audience, difficulty and tone here>';
  return `You are helping me build a live "Who Wants to Be a Millionaire" style quiz show.
Generate EXACTLY 15 multiple-choice questions that progress from very easy (Q1) to extremely hard (Q15).

TOPIC & GUIDANCE FROM THE HOST:
${guide}

======================================================
CRITICAL OUTPUT RULES — READ CAREFULLY BEFORE ANSWERING
======================================================
1. Output ONLY the 15 question blocks. No intro, no outro, no commentary, no markdown, no code fences, no headings.
2. Each question block MUST use EXACTLY these 7 lines, in this order, no extra lines inside a block:
   Line 1: <number>. <question text>
   Line 2: A) <choice A>
   Line 3: B) <choice B>
   Line 4: C) <choice C>
   Line 5: D) <choice D>
   Line 6: Correct: <A|B|C|D>
   Line 7: Prize: <number>
3. Between every two question blocks there MUST be ONE COMPLETELY BLANK LINE (i.e. two newline characters in a row, "\\n\\n"). Do NOT run blocks together. Do NOT use "---" or any separator — just a blank line.
4. There must be exactly 15 blocks, numbered 1 through 15, in order.
5. "Correct:" is a SINGLE uppercase letter A, B, C, or D — never the full answer text.
6. "Prize:" is the $JC reward for that rung. Use this exact ladder in order:
${PRIZE_LIST}
7. Questions 5 and 10 are "safe haven" checkpoints — make them memorable and slightly harder than surrounding ones.
8. No trick questions, no duplicate choices within a question, no "all of the above" / "none of the above".
9. Keep each question under ~200 characters and each choice under ~80 characters.
10. Do NOT wrap output in \`\`\` fences. Do NOT add "Here are your questions" or any explanation.

EXAMPLE OF THE REQUIRED SHAPE (2 blocks — you must produce 15):

1. What is the capital of France?
A) Berlin
B) Madrid
C) Paris
D) Rome
Correct: C
Prize: 25

2. Who painted the Mona Lisa?
A) Van Gogh
B) Da Vinci
C) Picasso
D) Monet
Correct: B
Prize: 50

Notice the single blank line between block 1 and block 2. Do the same between all 15 blocks.

Begin now with block 1.`;
}


export const AIPromptHelper: React.FC<AIPromptHelperProps> = ({ onInsert }) => {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => buildPrompt(topic), [topic]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success('Instructions copied — paste into ChatGPT, Claude, or Gemini');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const raw = await navigator.clipboard.readText();
      if (!raw || !raw.trim()) {
        toast.error('Clipboard is empty');
        return;
      }
      const cleaned = cleanAIResponse(raw);
      const { questions, errors } = parseLadder(cleaned);
      onInsert(cleaned);
      if (questions.length === 15 && errors.length === 0) {
        toast.success('Pasted 15 questions from clipboard');
      } else if (questions.length > 0) {
        toast.warning(`Pasted ${questions.length}/15 questions — check the highlighted issues below`);
      } else {
        toast.error('Could not detect any questions in that clipboard content');
      }
    } catch {
      toast.error('Clipboard access denied. Paste manually into the box below.');
    }
  };

  return (
    <Card className="p-4 space-y-3 border-primary/40 bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Let an AI agent write your questions</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Describe the topic, audience and tone for your show. Copy the instructions below and paste them into your
            favourite AI (ChatGPT, Claude, Gemini). Then paste the AI's response into the questions box.
          </p>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Your topic / guidance</label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={'e.g. 90s pop culture trivia for a fun casual crowd. Mix music, movies and TV. Playful tone, easy start, brutal by Q15.'}
              rows={3}
              className="text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Instructions for the AI agent</label>
            <Textarea
              value={prompt}
              readOnly
              rows={10}
              className="text-xs font-mono mt-1 bg-background"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="gold" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy instructions'}
            </Button>
            <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> ChatGPT
              </Button>
            </a>
            <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Claude
              </Button>
            </a>
            <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Gemini
              </Button>
            </a>
          </div>

          <div className="pt-2 border-t border-border/60 space-y-2">
            <p className="text-xs text-muted-foreground">
              Once the AI replies, copy its full response, then click below to auto-fill the 15 questions.
            </p>
            <Button size="sm" variant="gold" onClick={handlePasteFromClipboard} className="w-full gap-1.5">
              <ClipboardPaste className="w-4 h-4" />
              Paste AI response & auto-fill questions
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
