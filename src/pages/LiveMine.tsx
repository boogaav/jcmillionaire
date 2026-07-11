// /live/mine — dashboard of shows I've created
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Radio, Copy, Pencil, Trash2, Plus, ExternalLink, Lock, Play } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoginButtons } from '@/components/LoginButtons';

interface MyShow {
  id: string;
  name: string;
  slug: string;
  passcode: string | null;
  is_locked: boolean;
  is_sandbox: boolean;
  created_at: string;
}

export default function LiveMine() {
  const navigate = useNavigate();
  const { state } = useGame();
  const user = state.user;
  const [shows, setShows] = useState<MyShow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('live_quiz_sets')
      .select('id, name, slug, passcode, is_locked, is_sandbox, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setShows((data as MyShow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/live/${slug}`);
      toast.success('Link copied');
    } catch { toast.error('Copy failed'); }
  };

  const del = async (s: MyShow) => {
    if (!confirm(`Delete "${s.name}"? This can't be undone.`)) return;
    // Delete questions first (FK), then set (sessions cascade via FK if set; otherwise skip)
    await supabase.from('live_questions').delete().eq('quiz_set_id', s.id);
    const { error } = await supabase.from('live_quiz_sets').delete().eq('id', s.id);
    if (error) return toast.error(error.message);
    toast.success('Show deleted');
    load();
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-6 pb-32 px-4 max-w-md mx-auto flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="w-6 h-6" />
          <h1 className="text-2xl font-display font-bold">My Live Shows</h1>
        </div>
        <p className="text-center text-muted-foreground">Sign in to see your shows.</p>
        <LoginButtons />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 pb-32 px-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="w-6 h-6" />
          <h1 className="text-2xl font-display font-bold">My Live Shows</h1>
        </div>
        <Button onClick={() => navigate('/live/new')} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> New show
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading…</p>
      ) : shows.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-lg font-semibold">No shows yet</p>
          <p className="text-sm text-muted-foreground">Create your first 15-question live ladder.</p>
          <Button onClick={() => navigate('/live/new')} className="gap-2">
            <Plus className="w-4 h-4" /> Create a show
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {shows.map((s) => (
            <Card key={s.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold truncate">{s.name}</h2>
                    {s.is_locked && <Badge variant="secondary" className="gap-1"><Lock className="w-3 h-3" /> Locked</Badge>}
                    {s.is_sandbox && <Badge variant="outline">Sandbox</Badge>}
                    {s.passcode && <Badge variant="outline">Passcode</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">/live/{s.slug}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Link to={`/live/${s.slug}`} className="contents">
                  <Button variant="default" size="sm" className="gap-1 w-full"><Play className="w-3 h-3" /> Open</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => copyLink(s.slug)} className="gap-1">
                  <Copy className="w-3 h-3" /> Copy link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/live/${s.slug}/edit`)}
                  disabled={s.is_locked}
                  className="gap-1"
                  title={s.is_locked ? 'Cannot edit after a session has started' : 'Edit ladder'}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => del(s)} className="gap-1 text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
