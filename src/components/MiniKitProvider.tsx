import { useEffect, ReactNode } from 'react';
import { APP_ID } from '@/lib/constants';
import { ensureMiniKitInstalled, isInWorldApp } from '@/lib/minikit';

/**
 * MiniKitProvider - Initializes MiniKit SDK for World App integration
 * This must wrap the app to enable wallet auth and other MiniKit features
 */
export const MiniKitProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    // Install MiniKit with app_id so World ID popup shows "Jackie Chain"
    const installed = ensureMiniKitInstalled();
    import.meta.env.DEV && console.log('MiniKit installed with app_id:', APP_ID, 'isInstalled:', installed, 'inWorldApp:', isInWorldApp());
  }, []);

  return <>{children}</>;
};
