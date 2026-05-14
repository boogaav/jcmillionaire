import React from 'react';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { LoginButtons } from '@/components/LoginButtons';
import { useGame } from '@/contexts/GameContext';
import { isInWorldApp } from '@/lib/minikit';

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-label="X">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);


const AppHeader: React.FC = () => {
  const { state } = useGame();
  const { isVerified } = state;
  const inWorldApp = isInWorldApp();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <JackieIcon size={32} className="animate-float" />
          <span className="font-display font-bold text-foreground text-lg">Jackie Chain</span>
        </div>

        {!inWorldApp && (
          <div className="flex items-center gap-3">
            <a href="https://x.com/iamjackiechain" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <XIcon />
            </a>
          </div>
        )}

        {!isVerified ? <LoginButtons compact /> : <div />}
      </div>
    </header>
  );
};

export default AppHeader;
