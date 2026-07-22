// Home page for jackiechain.world — minimal gateway to the dedicated show app.
import { Button } from '@/components/ui/button';
import { Plus, Radio } from 'lucide-react';

const SHOW_APP_URL = 'https://millionaire.jackiechain.world';

export default function Live() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight mb-4">
        Who Wants to Be a <span className="text-primary">Crypto Millionaire</span>
      </h1>
      <p className="text-muted-foreground max-w-md mb-8">
        Host your own live trivia show or discover shows created by the community.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <a href={`${SHOW_APP_URL}/live/new`} className="w-full">
          <Button size="lg" className="w-full gap-2">
            <Plus className="w-4 h-4" /> Host a show
          </Button>
        </a>
        <a href={`${SHOW_APP_URL}/live`} className="w-full">
          <Button size="lg" variant="outline" className="w-full gap-2">
            <Radio className="w-4 h-4" /> Explore Shows
          </Button>
        </a>
      </div>
    </div>
  );
}
