import React from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { LoginButtons } from '@/components/LoginButtons';
import { Button } from '@/components/ui/button';
import { useGame } from '@/contexts/GameContext';
import { isInWorldApp } from '@/lib/minikit';
import { clearStoredUser } from '@/lib/userService';

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-label="X">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const PumpFunIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-label="Pump.fun">
    <path d="M16.94 3.06a5.25 5.25 0 0 1 0 7.43l-1.06 1.06-7.43-7.43 1.06-1.06a5.25 5.25 0 0 1 7.43 0zM7.43 4.84l11.73 11.73-2.59 2.59a5.25 5.25 0 1 1-7.43-7.43l1.06-1.06-4.3-4.3a1.5 1.5 0 0 1 0-2.12 1.5 1.5 0 0 1 1.53-.41z" />
  </svg>
);

const AppHeader: React.FC = () => {
  const { state, dispatch } = useGame();
  const { isVerified } = state;
  const inWorldApp = isInWorldApp();

  const handleLogout = () => {
    clearStoredUser();
    dispatch({ type: 'SET_USER', payload: null });
    toast.success('Logged out');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-foreground text-lg">Jackie Chain</span>
        </div>

        <div className="flex items-center gap-3">
          {!inWorldApp && (
            <>
              <a
                href="https://pump.fun/coin/BTfxgSELtGJmWcjePoKwQuoFhSUYCxhkGv2VpcYBpump"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <PumpFunIcon />
                <span>Trade $JC</span>
              </a>
              <a href="https://x.com/iamjackiechain" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <XIcon />
              </a>
            </>
          )}

          {!isVerified ? (
            <LoginButtons compact />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-destructive"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
