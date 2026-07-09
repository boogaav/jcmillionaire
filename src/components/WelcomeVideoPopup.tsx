import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'jc_welcome_video_seen';
const TWEET_ID = '2074523993462522367';

export const WelcomeVideoPopup: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in"
      onClick={close}
    >
      <div
        className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-display font-bold text-base text-foreground">
            👋 Welcome to Jackie Chain
          </h3>
          <button
            onClick={close}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="relative w-full bg-secondary" style={{ aspectRatio: '9 / 16', maxHeight: '70vh' }}>
          <iframe
            src={`https://platform.x.com/embed/Tweet.html?id=${TWEET_ID}&theme=dark`}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            title="Welcome video"
          />
        </div>

        <div className="p-3">
          <button
            onClick={close}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Let's go
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeVideoPopup;
