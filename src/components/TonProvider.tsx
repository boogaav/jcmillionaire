import { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

const manifestUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/tonconnect-manifest.json`
    : 'https://jcmillionaire.lovable.app/tonconnect-manifest.json';

export const TonProvider = ({ children }: { children: ReactNode }) => {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
};
