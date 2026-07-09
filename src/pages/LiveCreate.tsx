// /live/new — any signed-in user can create their own 15-question ladder
// and get a shareable URL /live/:slug they control.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Radio, Copy, Sparkles, AlertTriangle, Save, Trash2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { LoginButtons } from '@/components/LoginButtons';
import { parseLadder, EXAMPLE_LADDER } from '@/lib/liveParser';

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export default function LiveCreate() {
  const navigate = useNavigate();
  const { state } = useGame();
  const user = state.user;

  const draftKey = user ? `live_draft_v1:${user.id}` : 'live_draft_v1:anon';

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [rawText, setRawText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate draft on mount / when user changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && typeof d === 'object') {
          setTitle(d.title || '');
          setSlug(d.slug || '');
          setSlugTouched(!!d.slugTouched);
          setPasscode(d.passcode || '');
          setRawText(d.rawText || '');
          setSavedAt(d.savedAt || null);
          if (d.title || d.rawText) toast.info('Draft restored');
        }
      }
    } catch {}
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Autosave (debounced)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => {
      const hasContent = title || slug || passcode || rawText;
      if (!hasContent) return;
      const now = Date.now();
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ title, slug, slugTouched, passcode, rawText, savedAt: now }),
        );
        setSavedAt(now);
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [title, slug, slugTouched, passcode, rawText, draftKey]);

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    setTitle(''); setSlug(''); setSlugTouched(false); setPasscode(''); setRawText('');
    setSavedAt(null);
    toast.success('Draft cleared');
  };

  const parsed = useMemo(() => parseLadder(rawText || ''), [rawText]);
  const canSubmit = !!user && title.trim().length >= 3 && /^[a-z0-9][a-z0-9-]{2,39}$/.test(slug) && parsed.questions.length === 15 && parsed.errors.length === 0;

  const effectiveSlug = slug || (slugTouched ? '' : slugify(title));

  const create = async () => {
    if (!user) return;
    if (!canSubmit) { toast.error('Fill in the form and paste 15 valid questions.'); return; }
    setSubmitting(true);
    try {
      // 1. Insert quiz set
      const { data: qset, error: qErr } = await supabase
        .from('live_quiz_sets')
        .insert({
          name: title.trim(),
          slug,
          passcode: passcode.trim() || null,
          created_by: user.id,
        } as never)
        .select('id, slug')
        .single();
      if (qErr || !qset) {
        toast.error(qErr?.message.includes('live_quiz_sets_slug_key') ? 'That URL is already taken.' : (qErr?.message || 'Failed to create show'));
        return;
      }
      // 2. Insert 15 questions
      const rows = parsed.questions.map((q) => ({ ...q, quiz_set_id: qset.id }));
      const { error: qsErr } = await supabase.from('live_questions').insert(rows);
      if (qsErr) {
        toast.error(qsErr.message);
        return;
      }
      toast.success('Show created! Share the link with your audience.');
      try { localStorage.removeItem(draftKey); } catch {}
      navigate(`/live/${qset.slug}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-6 pb-32 px-4 max-w-md mx-auto flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="w-6 h-6 animate-pulse" />
          <h1 className="text-3xl font-display font-bold">Create a Live Show</h1>
        </div>
        <p className="text-center text-muted-foreground">Sign in to create your own 15-question live ladder.</p>
        <LoginButtons />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 pb-32 px-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="w-6 h-6 animate-pulse" />
          <h1 className="text-2xl font-display font-bold">Create a Live Show</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {savedAt && (
            <span className="flex items-center gap-1"><Save className="w-3 h-3" /> Draft saved</span>
          )}
          {(title || rawText || passcode || slug) && (
            <Button variant="ghost" size="sm" onClick={clearDraft} className="h-7 gap-1 text-destructive hover:text-destructive">
              <Trash2 className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <label className="text-sm font-semibold">Show title</label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Friday Night Trivia"
            maxLength={80}
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Show URL</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">/live/</span>
            <Input
              value={effectiveSlug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
              placeholder="friday-night"
              maxLength={40}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Lowercase letters, numbers and hyphens. 3–40 characters.</p>
        </div>

        <div>
          <label className="text-sm font-semibold">Guest passcode <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Leave empty for open access"
            maxLength={40}
          />
          <p className="text-xs text-muted-foreground mt-1">Spectators can always watch. Guests need this code to submit answers.</p>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-semibold">Paste your 15 questions</label>
          <Button variant="ghost" size="sm" onClick={() => setRawText(EXAMPLE_LADDER)} className="gap-1">
            <Sparkles className="w-3 h-3" /> Insert example
          </Button>
        </div>
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`1. What is 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 22\nCorrect: B\nPrize: 100\n\n2. ...`}
          rows={16}
          className="font-mono text-sm"
        />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Format:</strong> question line, then 4 lines <code>A) B) C) D)</code>, then <code>Correct: B</code>. Optional <code>Prize: 100</code>. Separate questions with a blank line.</p>
          <p>Prize defaults to the standard $JC ladder if omitted.</p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={parsed.questions.length === 15 ? 'text-green-500 font-semibold' : 'text-muted-foreground'}>
            Parsed {parsed.questions.length} / 15 questions
          </span>
          {parsed.errors.length > 0 && (
            <span className="text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {parsed.errors.length} issue{parsed.errors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {parsed.errors.length > 0 && (
          <ul className="text-xs text-destructive list-disc list-inside space-y-0.5 max-h-32 overflow-auto">
            {parsed.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </Card>

      <Button
        variant="default"
        size="lg"
        className="w-full"
        disabled={!canSubmit || submitting}
        onClick={create}
      >
        {submitting ? 'Creating…' : 'Create show'}
      </Button>
    </div>
  );
}
