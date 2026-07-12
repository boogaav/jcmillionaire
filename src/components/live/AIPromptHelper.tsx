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
Please generate exactly 15 multiple-choice questions that progress from very easy (Q1) to extremely hard (Q15).

TOPIC & GUIDANCE FROM THE HOST:
${guide}

STRICT OUTPUT FORMAT — output ONLY the questions, nothing else. No intro, no commentary, no markdown fences.

Each question MUST follow this exact block, with a single blank line between blocks:

1. <question text>
A) <choice A>
B) <choice B>
C) <choice C>
D) <choice D>
Correct: <A|B|C|D>
Prize: <number>

Rules:
- Exactly 15 blocks numbered 1 to 15.
- Each block has 4 choices A) B) C) D) — one and only one correct answer.
- "Correct:" must be a single letter A, B, C, or D.
- "Prize:" is the $JC reward for that question. Use this exact ladder:
${PRIZE_LIST}
- Questions 5 and 10 are "safe haven" checkpoints — make them memorable and slightly harder than the surrounding ones.
- No trick questions, no duplicate answers, no "all of the above".
- Keep each question under ~200 characters. Keep each choice under ~80 characters.
- Do NOT wrap the output in code fences or add explanations. Output raw text only.

Begin now.`;
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

          <p className="text-xs text-muted-foreground">
            Once the AI replies, copy its whole response and paste it into the "Paste your 15 questions" box below.
          </p>
        </div>
      )}
    </Card>
  );
};
