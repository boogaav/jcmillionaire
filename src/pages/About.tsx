import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { LoginButtons } from '@/components/LoginButtons';
import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight, Gamepad2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useGame } from '@/contexts/GameContext';
import { isInWorldApp } from '@/lib/minikit';

// Social icons
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-label="X">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-label="Instagram">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-label="TikTok">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

import bookCover from '@/assets/book-cover.jpg';
import bookPage2 from '@/assets/book-page2.jpg';
import bookPage3 from '@/assets/book-page3.jpg';

const BOOK_IMAGES = [bookCover, bookPage2, bookPage3];

const EPISODES = [
  { title: 'Trailer', tweetId: '2023789539500650640' },
  { title: 'Ep 1.1', tweetId: '2026298838999593426' },
  { title: 'Ep 1.2', tweetId: '2026641489732985104' },
  { title: 'Ep 1.3', tweetId: '2029574483707855000' },
];

const TESTIMONIAL_IDS = [
  '1863358898909888752',
  '1862060733418127799',
  '1862415421913079894',
  '1861483513800991025',
];

const TweetEmbed: React.FC<{ tweetId: string; className?: string; iframeHeight?: string }> = ({ tweetId, className, iframeHeight = '180px' }) => (
  <div className={cn('rounded-xl overflow-hidden border border-border/20 bg-card flex-shrink-0', className)}>
    <iframe
      src={`https://platform.x.com/embed/Tweet.html?id=${tweetId}&theme=dark`}
      className="w-full border-0"
      style={{ height: iframeHeight }}
      allowFullScreen
      loading="lazy"
    />
  </div>
);

const About: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGame();
  const { isVerified } = state;
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [currentEpisode, setCurrentEpisode] = React.useState(0);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  const handleDownloadBook = async () => {
    if (isInWorldApp()) {
      toast.error('Book download opens outside the Mini App. Please use the web version.');
      return;
    }

    setIsDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('books')
        .createSignedUrl('JACKIE_CHAIN_ADVENTURE_3.pdf', 300);

      if (error) throw error;
      if (data?.signedUrl) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = 'Jackie_Chain_Adventure.pdf';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Could not download the book. Try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % BOOK_IMAGES.length);
  const prevSlide = () => setCurrentSlide((p) => (p - 1 + BOOK_IMAGES.length) % BOOK_IMAGES.length);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 pt-20 pb-24 overflow-y-auto">
        {/* Hero Section */}
        <section className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-bold uppercase tracking-tight text-gradient-gold mb-8">
            Jackie Chain Adventure
          </h1>

          {/* Book Carousel */}
          <div className="relative w-full max-w-sm mx-auto mb-6">
            <div className="overflow-hidden rounded-2xl border border-border shadow-lg aspect-[3/4] bg-card">
              <img
                src={BOOK_IMAGES[currentSlide]}
                alt={`Book preview ${currentSlide + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            </div>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:bg-card transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:bg-card transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex justify-center gap-2 mt-3">
              {BOOK_IMAGES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-colors',
                    i === currentSlide ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>
          </div>

          <h2 className="text-xl font-display font-bold text-foreground mb-2">Jackie Chain Adventure Book</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Dive into the world of Jackie Chain — an illustrated adventure full of mystery, puzzles, and crypto culture.
          </p>
          <Button variant="gold" size="lg" onClick={handleDownloadBook} disabled={isDownloading} className="gap-2">
            <Download className="w-5 h-5" />
            {isDownloading ? 'Preparing...' : 'Get the Book'}
          </Button>
        </section>

        {/* Episodes Section */}
        <section className="px-4 py-10 max-w-4xl mx-auto">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Watch the Trailer!</h3>

          {/* Mobile: featured + horizontal slider */}
          <div className="md:hidden space-y-3">
            <div>
              <TweetEmbed tweetId={EPISODES[0].tweetId} className="w-full max-w-sm mx-auto" iframeHeight="480px" />
              <p className="text-xs font-medium text-muted-foreground text-center mt-1">{EPISODES[0].title}</p>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
              {EPISODES.slice(1).map((ep) => (
                <div key={ep.tweetId} className="snap-start shrink-0 w-[70%]">
                  <TweetEmbed tweetId={ep.tweetId} className="w-full" iframeHeight="360px" />
                  <p className="text-xs font-medium text-muted-foreground text-center mt-1">{ep.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-4 gap-2">
            {EPISODES.map((ep) => (
              <div key={ep.tweetId} className="space-y-1">
                <TweetEmbed tweetId={ep.tweetId} className="w-full" iframeHeight="360px" />
                <p className="text-xs font-medium text-muted-foreground text-center">{ep.title}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Play Game Button */}
        <section className="flex justify-center px-4 py-8">
          <Button variant="outline" size="xl" className="gap-2" onClick={() => navigate('/')}>
            <Gamepad2 className="w-5 h-5" />
            Play the Game
          </Button>
        </section>

        {/* Testimonials Section */}
        <section className="px-4 py-10 max-w-4xl mx-auto">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">What People Say</h3>

          {/* Mobile: featured + horizontal slider */}
          <div className="md:hidden space-y-3">
            <div>
              <TweetEmbed tweetId={TESTIMONIAL_IDS[0]} className="w-full max-w-sm mx-auto" iframeHeight="320px" />
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
              {TESTIMONIAL_IDS.slice(1).map((id) => (
                <div key={id} className="snap-start shrink-0 w-[70%]">
                  <TweetEmbed tweetId={id} className="w-full" iframeHeight="240px" />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-3 gap-2">
            {TESTIMONIAL_IDS.slice(0, 3).map((id) => (
              <div key={id}>
                <TweetEmbed tweetId={id} className="w-full" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
