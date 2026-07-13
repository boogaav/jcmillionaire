// /live/new — create a new 15-question ladder
// /live/:slug/edit — edit an existing (unlocked) ladder owned by the current user
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Radio, Sparkles, AlertTriangle, Save, Trash2, Lock, Image as ImageIcon, Upload, X, ChevronUp, ChevronDown } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { LoginButtons } from '@/components/LoginButtons';
import { parseLadder, EXAMPLE_LADDER } from '@/lib/liveParser';
import { AIPromptHelper } from '@/components/live/AIPromptHelper';

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

function stringifyExisting(qs: Array<{
  question: string; choice_a: string; choice_b: string; choice_c: string; choice_d: string;
  correct_choice: string; prize_amount: number; order_index: number; image_url?: string | null;
}>) {
  return qs
    .sort((a, b) => a.order_index - b.order_index)
    .map((q, i) => {
      const base = `${i + 1}. ${q.question}\nA) ${q.choice_a}\nB) ${q.choice_b}\nC) ${q.choice_c}\nD) ${q.choice_d}\nCorrect: ${q.correct_choice}\nPrize: ${q.prize_amount}`;
      return q.image_url ? `${base}\nImage: ${q.image_url}` : base;
    })
    .join('\n\n');
}


export default function LiveCreate() {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const isEdit = !!routeSlug;
  const { state } = useGame();
  const user = state.user;

  const draftKey = user
    ? isEdit ? `live_edit_v1:${user.id}:${routeSlug}` : `live_draft_v1:${user.id}`
    : 'live_draft_v1:anon';

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [rawText, setRawText] = useState('');
  const [imageOverrides, setImageOverrides] = useState<Record<number, string>>({});
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [editSetId, setEditSetId] = useState<string | null>(null);
  const [editLocked, setEditLocked] = useState(false);
  const [notOwner, setNotOwner] = useState(false);
  const hydratedRef = useRef(false);


  // Load existing show for edit mode
  useEffect(() => {
    if (!isEdit || !routeSlug || !user) return;
    (async () => {
      setLoading(true);
      const { data: qset } = await supabase
        .from('live_quiz_sets')
        .select('id, name, slug, passcode, created_by, is_locked')
        .eq('slug', routeSlug)
        .maybeSingle();
      if (!qset) { toast.error('Show not found'); navigate('/live/mine'); return; }
      if (qset.created_by !== user.id) { setNotOwner(true); setLoading(false); return; }
      setEditSetId(qset.id);
      setEditLocked(!!qset.is_locked);
      setTitle(qset.name || '');
      setSlug(qset.slug || '');
      setSlugTouched(true);
      setPasscode(qset.passcode || '');
      const { data: qs } = await supabase
        .from('live_questions')
        .select('question, choice_a, choice_b, choice_c, choice_d, correct_choice, prize_amount, order_index, image_url')
        .eq('quiz_set_id', qset.id)
        .order('order_index');
      setRawText(stringifyExisting((qs as any) || []));
      setLoading(false);
      hydratedRef.current = true;

    })();
  }, [isEdit, routeSlug, user, navigate]);

  // Hydrate draft (create mode only)
  useEffect(() => {
    if (isEdit) return;
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
  }, [draftKey, isEdit]);

  // Autosave (both modes)
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
    if (!isEdit) {
      setTitle(''); setSlug(''); setSlugTouched(false); setPasscode(''); setRawText('');
      setSavedAt(null);
    }
    toast.success('Draft cleared');
  };

  const parsed = useMemo(() => parseLadder(rawText || ''), [rawText]);
  const canSubmit = !!user && !editLocked && title.trim().length >= 3
    && /^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)
    && parsed.questions.length === 15
    && parsed.errors.length === 0;

  const effectiveSlug = slug || (slugTouched ? '' : slugify(title));

  // Merge image override into parsed row (override wins over Image: line)
  const withImages = (rows: typeof parsed.questions) =>
    rows.map((q, i) => ({
      ...q,
      image_url: (imageOverrides[i] ?? q.image_url ?? null) || null,
    }));

  const submit = async () => {
    if (!user) return;
    if (!canSubmit) { toast.error('Fill in the form and paste 15 valid questions.'); return; }
    setSubmitting(true);
    try {
      if (isEdit && editSetId) {
        // Update quiz set
        const { error: uErr } = await supabase
          .from('live_quiz_sets')
          .update({ name: title.trim(), slug, passcode: passcode.trim() || null })
          .eq('id', editSetId);
        if (uErr) {
          toast.error(uErr.message.includes('live_quiz_sets_slug_key') ? 'That URL is already taken.' : uErr.message);
          return;
        }
        // Replace questions
        await supabase.from('live_questions').delete().eq('quiz_set_id', editSetId);
        const rows = withImages(parsed.questions).map((q) => ({ ...q, quiz_set_id: editSetId }));
        const { error: qsErr } = await supabase.from('live_questions').insert(rows);
        if (qsErr) { toast.error(qsErr.message); return; }
        toast.success('Show updated');
        try { localStorage.removeItem(draftKey); } catch {}
        navigate(`/live/${slug}`);
      } else {
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
        const rows = withImages(parsed.questions).map((q) => ({ ...q, quiz_set_id: qset.id }));
        const { error: qsErr } = await supabase.from('live_questions').insert(rows);
        if (qsErr) { toast.error(qsErr.message); return; }
        toast.success('Show created! Share the link with your audience.');
        try { localStorage.removeItem(draftKey); } catch {}
        navigate(`/live/${qset.slug}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const uploadImage = async (idx: number, file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please pick an image file'); return; }
    setUploadingIdx(idx);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `live/${user.id}/${Date.now()}-${idx}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('question-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) { toast.error(upErr.message); return; }
      const { data: pub } = supabase.storage.from('question-images').getPublicUrl(path);
      setImageOverrides((m) => ({ ...m, [idx]: pub.publicUrl }));
      toast.success('Image uploaded');
    } finally {
      setUploadingIdx(null);
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen pt-6 pb-32 px-4 max-w-md mx-auto flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="w-6 h-6 animate-pulse" />
          <h1 className="text-3xl font-display font-bold">{isEdit ? 'Edit Show' : 'Host a Live Show'}</h1>
        </div>
        <p className="text-center text-muted-foreground">Sign in to {isEdit ? 'edit your show' : 'create your own 15-question live ladder'}.</p>
        <LoginButtons />
      </div>
    );
  }

  if (isEdit && notOwner) {
    return (
      <div className="min-h-screen pt-6 pb-32 px-4 max-w-md mx-auto text-center space-y-3">
        <h1 className="text-2xl font-bold">Not your show</h1>
        <p className="text-muted-foreground">You can only edit shows you created.</p>
        <Button onClick={() => navigate('/live/mine')}>Back to My Shows</Button>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  }

  return (
    <div className="min-h-screen pt-4 pb-32 px-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="w-6 h-6 animate-pulse" />
          <h1 className="text-2xl font-display font-bold">{isEdit ? 'Edit Show' : 'Host a Live Show'}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {savedAt && (
            <span className="flex items-center gap-1"><Save className="w-3 h-3" /> Draft saved</span>
          )}
          {(title || rawText || passcode || slug) && !isEdit && (
            <Button variant="ghost" size="sm" onClick={clearDraft} className="h-7 gap-1 text-destructive hover:text-destructive">
              <Trash2 className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {isEdit && editLocked && (
        <Card className="p-4 border-yellow-500/40 bg-yellow-500/10 flex items-center gap-2 text-sm">
          <Lock className="w-4 h-4 text-yellow-500" />
          <span>This show has already been broadcast and can no longer be edited. Duplicate it into a new show to make changes.</span>
        </Card>
      )}

      <fieldset disabled={editLocked} className="space-y-5">
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

        <AIPromptHelper onInsert={(text) => setRawText(text)} />

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold">Paste your 15 questions</label>
            {!isEdit && (
              <Button variant="ghost" size="sm" onClick={() => setRawText(EXAMPLE_LADDER)} className="gap-1">
                <Sparkles className="w-3 h-3" /> Insert example
              </Button>
            )}
          </div>
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`1. What is 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 22\nCorrect: B\nPrize: 100\n\n2. ...`}
            rows={16}
            className="font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Format:</strong> question line, then 4 lines <code>A) B) C) D)</code>, then <code>Correct: B</code>. Optional <code>Prize: 100</code> and <code>Image: https://…</code>. Separate questions with a blank line.</p>
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

        {parsed.questions.length > 0 && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <label className="text-sm font-semibold">Question images (optional)</label>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a picture or paste an image URL to show above the question during the live show.
            </p>
            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {parsed.questions.map((q, i) => {
                const url = imageOverrides[i] ?? q.image_url ?? '';
                return (
                  <div key={i} className="flex gap-3 items-start border border-border rounded-lg p-2">
                    <div className="w-16 h-16 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold truncate">Q{i + 1}. {q.question}</p>
                      <div className="flex gap-1">
                        <Input
                          value={url}
                          onChange={(e) => setImageOverrides((m) => ({ ...m, [i]: e.target.value }))}
                          placeholder="https://…"
                          className="h-8 text-xs"
                        />
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={uploadingIdx !== null}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(i, f); e.currentTarget.value = ''; }}
                          />
                          <span className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-input bg-background text-xs hover:bg-accent">
                            {uploadingIdx === i ? '…' : <Upload className="w-3 h-3" />}
                          </span>
                        </label>
                        {url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => setImageOverrides((m) => ({ ...m, [i]: '' }))}
                            title="Clear image"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </fieldset>

      <Button
        variant="default"
        size="lg"
        className="w-full"
        disabled={!canSubmit || submitting}
        onClick={submit}
      >
        {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create show'}
      </Button>
    </div>
  );
}

