import React from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { isInWorldApp } from '@/lib/minikit';

const XBanner: React.FC = () => {
  const inWorldApp = isInWorldApp();

  return (
    <div className="w-full">
      {!inWorldApp && (
        <a
          href="https://x.com/iamjackiechain"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-foreground text-background px-4 py-1.5 text-center text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <span className="inline-flex items-center gap-2">
            🤝 Let's be friends on
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-label="X">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @iamjackiechain
          </span>
        </a>
      )}
      <Link
        to="/live"
        className="block w-full bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground px-4 py-2 text-center text-sm font-bold hover:brightness-110 transition-all"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Radio className="w-4 h-4 animate-pulse" />
          Run your own Crypto Millionaire show
        </span>
      </Link>
    </div>
  );
};

export default XBanner;
