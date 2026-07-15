import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Check, Loader2 } from 'lucide-react';
import { MiniKit, Permission, RequestPermissionPayload } from '@worldcoin/minikit-js';
import { toast } from 'sonner';

type NotificationStatus = 'idle' | 'loading' | 'granted' | 'denied';

interface NotificationSubscriptionProps {
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

export const NotificationSubscription: React.FC<NotificationSubscriptionProps> = ({
  onComplete,
  onSkip,
  className = '',
}) => {
  const [status, setStatus] = useState<NotificationStatus>('idle');

  const requestNotificationPermission = useCallback(async () => {
    if (!MiniKit.isInstalled()) {
      toast.error('MiniKit not available');
      return;
    }

    setStatus('loading');

    try {
      const requestPermissionPayload: RequestPermissionPayload = {
        permission: Permission.Notifications,
      };

      // Use the async command API with proper typing
      const { finalPayload } = await MiniKit.commandsAsync.requestPermission(requestPermissionPayload);

      import.meta.env.DEV && console.log('Permission response:', finalPayload);

      if (finalPayload.status === 'success') {
        setStatus('granted');
        toast.success('Notifications enabled! We\'ll keep you updated.');
        
        // Store that user enabled notifications
        localStorage.setItem('jc_notifications_enabled', 'true');
        
        setTimeout(() => {
          onComplete?.();
        }, 1000);
      } else {
        // Handle various error codes
        const errorCode = finalPayload.error_code || 'unknown';
        
        if (errorCode === 'already_granted') {
          setStatus('granted');
          localStorage.setItem('jc_notifications_enabled', 'true');
          toast.success('Notifications already enabled!');
          setTimeout(() => {
            onComplete?.();
          }, 1000);
        } else if (errorCode === 'user_rejected' || errorCode === 'already_requested') {
          setStatus('denied');
          toast.info('No worries, you can enable notifications later in settings.');
        } else {
          setStatus('idle');
          toast.error('Could not enable notifications. Please try again.');
          console.error('Permission error:', errorCode, finalPayload);
        }
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setStatus('idle');
      toast.error('Failed to request notification permission');
    }
  }, [onComplete]);

  const handleSkip = () => {
    localStorage.setItem('jc_notifications_skipped', 'true');
    onSkip?.();
  };

  if (status === 'granted') {
    return (
      <div className={`flex flex-col items-center gap-3 animate-bounce-in ${className}`}>
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-success" />
        </div>
        <p className="text-sm text-success font-medium">Notifications enabled!</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Bell className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Stay Updated</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Get notified when new games start and when your rewards are ready to claim.
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          onClick={requestNotificationPermission}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enabling...
            </>
          ) : status === 'denied' ? (
            <>
              <BellOff className="w-5 h-5" />
              Try Again
            </>
          ) : (
            <>
              <Bell className="w-5 h-5" />
              Enable Notifications
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={handleSkip}
          disabled={status === 'loading'}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
};

export default NotificationSubscription;
