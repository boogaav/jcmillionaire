// /live — product landing page for the Crypto Millionaire live show feature.
// The runtime for the legacy singleton admin session lives at /live/legacy.
// Per-show pages live at /live/:slug.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, Plus, Sparkles, Users, Trophy, ArrowRight, Play } from 'lucide-react';

interface LiveShow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_sandbox: boolean;
  session_status?: string | null;
  session_active?: boolean;
}

export default function Live() {
  const { isAdmin } = useGame();
  const [liveNow, setLiveNow] = useState<LiveShow[]>([]);
  const [upcoming, setUpcoming] = useState<LiveShow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: sets } = await supabase
        .from('live_quiz_sets')
        .select('id, name, slug, description, is_sandbox')
        .not('slug', 'is', null)
        .order('created_at', { ascending: false })
        .limit(40);

      const shows = (sets as LiveShow[]) || [];
      if (shows.length === 0) {
        setLoading(false);
        return;
      }

      const { data: sessions } = await supabase
        .from('live_sessions')
        .select('quiz_set_id, status, is_active')
        .in('quiz_set_id', shows.map((s) => s.id));

      const byId = new Map<string, { status: string; is_active: boolean }>();
      (sessions || []).forEach((s: any) => {
        const prev = byId.get(s.quiz_set_id);
        if (!prev || s.is_active) byId.set(s.quiz_set_id, { status: s.status, is_active: s.is_active });
      });

      const withStatus = shows.map((s) => ({
        ...s,
        session_status: byId.get(s.id)?.status || null,
        session_active: !!byId.get(s.id)?.is_active,
      }));

      setLiveNow(withStatus.filter((s) => s.session_active));
      setUpcoming(withStatus.filter((s) => !s.session_active).slice(0, 8));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen pb-32 px-4 max-w-3xl mx-auto">
      {/* Hero */}
      <section className="pt-8 pb-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> New — Host your own show
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight">
          Run your own <span className="text-primary">Crypto Millionaire</span> show
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Paste 15 questions, share a link, and host a live Kahoot-style trivia night with your community.
          Spectators can watch, guests can play for bragging rights.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/live/new">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              <Plus className="w-4 h-4" /> Create a show
            </Button>
          </Link>
          <Link to="/live/mine">
            <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
              <Radio className="w-4 h-4" /> My shows
            </Button>
          </Link>
        </div>
      </section>

      {/* Live now */}
      <section className="space-y-3 mb-8">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-lg font-bold">Live now</h2>
        </div>
        {loading ? (
          <Card className="p-5 text-sm text-muted-foreground">Loading shows…</Card>
        ) : liveNow.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">
            No shows are live right now. Be the first — <Link to="/live/new" className="text-primary font-semibold">start one</Link>.
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {liveNow.map((s) => (
              <ShowCard key={s.id} show={s} live />
            ))}
          </div>
        )}
      </section>

      {/* Recent / upcoming */}
      {upcoming.length > 0 && (
        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-bold">Recent shows</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((s) => (
              <ShowCard key={s.id} show={s} />
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-bold">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4 space-y-2">
            <Plus className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">1. Paste your questions</h3>
            <p className="text-xs text-muted-foreground">15 questions, 4 choices each. We parse plain text automatically.</p>
          </Card>
          <Card className="p-4 space-y-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">2. Share your link</h3>
            <p className="text-xs text-muted-foreground">Pick a slug like <code>friday-night</code>, add an optional passcode.</p>
          </Card>
          <Card className="p-4 space-y-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">3. Host live</h3>
            <p className="text-xs text-muted-foreground">Reveal answers, watch the leaderboard, crown a winner.</p>
          </Card>
        </div>
      </section>

      {/* Admin: legacy singleton runtime */}
      {isAdmin && (
        <section className="mb-8">
          <Card className="p-4 flex items-center justify-between gap-3 border-dashed">
            <div>
              <p className="font-semibold text-sm">Legacy admin session</p>
              <p className="text-xs text-muted-foreground">The old singleton live room (pre-slug).</p>
            </div>
            <Link to="/live/legacy">
              <Button variant="outline" size="sm" className="gap-1">
                Open <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </Card>
        </section>
      )}
    </div>
  );
}

function ShowCard({ show, live }: { show: LiveShow; live?: boolean }) {
  return (
    <Link to={`/live/${show.slug}`} className="block group">
      <Card className="p-4 h-full hover:border-primary/50 transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold group-hover:text-primary transition-colors line-clamp-2">{show.name}</h3>
          {live && (
            <Badge variant="destructive" className="shrink-0 gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </Badge>
          )}
        </div>
        {show.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{show.description}</p>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">/{show.slug}</span>
          <span className="text-primary font-semibold flex items-center gap-1">
            {live ? <><Play className="w-3 h-3" /> Join</> : <>View <ArrowRight className="w-3 h-3" /></>}
          </span>
        </div>
      </Card>
    </Link>
  );
}
