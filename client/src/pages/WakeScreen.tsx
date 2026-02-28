import { useState, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
const HEALTH_URL  = `${BACKEND_URL}/health`;

// How long to attempt wake before showing full screen (ms)
const WAKE_TIMEOUT = 30_000;
// How often to poll health endpoint while waking (ms)
const POLL_INTERVAL = 2_000;

type WakeStatus = 'checking' | 'awake' | 'waking' | 'slow';

interface WakeScreenProps {
  children: React.ReactNode;
}

const dots = ['', '.', '..', '...'];

const WakeScreen = ({ children }: WakeScreenProps) => {
  const [status,   setStatus]   = useState<WakeStatus>('checking');
  const [elapsed,  setElapsed]  = useState(0);
  const [dotIdx,   setDotIdx]   = useState(0);

  useEffect(() => {
    let isMounted  = true;
    let pollTimer:  ReturnType<typeof setInterval>;
    let dotTimer:   ReturnType<typeof setInterval>;
    let elapsedTimer: ReturnType<typeof setInterval>;
    const startTime = Date.now();

    // Animate dots
    dotTimer = setInterval(() => setDotIdx(i => (i + 1) % 4), 500);

    // Track elapsed time
    elapsedTimer = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      if (isMounted) setElapsed(secs);
    }, 1000);

    const checkHealth = async (): Promise<boolean> => {
      try {
        const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(4000) });
        if (res.ok) return true;
      } catch {}
      return false;
    };

    const wake = async () => {
      // Fast first check — if already awake, show immediately
      const awake = await checkHealth();
      if (!isMounted) return;

      if (awake) {
        setStatus('awake');
        return;
      }

      // Server is sleeping — start waking it
      setStatus('waking');

      pollTimer = setInterval(async () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > WAKE_TIMEOUT) {
          if (isMounted) setStatus('slow');
          clearInterval(pollTimer);
          return;
        }

        const ok = await checkHealth();
        if (ok && isMounted) {
          setStatus('awake');
          clearInterval(pollTimer);
        }
      }, POLL_INTERVAL);
    };

    wake();

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      clearInterval(dotTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  // Server is up — render the app normally
  if (status === 'awake') return <>{children}</>;

  // Loading / waking screen
  const messages: Record<WakeStatus, { headline: string; sub: string; showBar: boolean }> = {
    checking: {
      headline: 'Connecting to BagichaLink',
      sub:      'Checking server status…',
      showBar:  false,
    },
    waking: {
      headline: 'Waking up the server',
      sub:      `Free servers sleep when idle. Warming up${dots[dotIdx]} (${elapsed}s)`,
      showBar:  true,
    },
    slow: {
      headline: 'Almost there…',
      sub:      'Taking a bit longer than usual. Hang tight!',
      showBar:  true,
    },
    awake: {
      headline: '',
      sub:      '',
      showBar:  false,
    },
  };

  const msg = messages[status];
  // Progress bar fills over 30s max
  const progress = Math.min((elapsed / 30) * 100, 95);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background px-8">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-2xl shadow-lg">
          🌿
        </div>
        <span className="font-display text-2xl text-foreground">BagichaLink</span>
      </div>

      {/* Animated plant */}
      <div className="text-6xl mb-8 animate-bounce" style={{ animationDuration: '2s' }}>
        {status === 'checking' ? '🌱' : status === 'slow' ? '🌳' : '🪴'}
      </div>

      {/* Text */}
      <h2 className="font-display text-xl text-foreground text-center mb-2">
        {msg.headline}
      </h2>
      <p className="text-sm text-muted-foreground text-center font-body max-w-xs leading-relaxed">
        {msg.sub}
      </p>

      {/* Progress bar */}
      {msg.showBar && (
        <div className="mt-8 w-full max-w-xs space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-[11px] text-muted-foreground font-tag">
            {elapsed < 10
              ? 'Starting up containers…'
              : elapsed < 20
              ? 'Connecting to database…'
              : 'Loading your plants…'}
          </p>
        </div>
      )}

      {/* Tip */}
      <div className="mt-12 bg-card rounded-2xl px-5 py-4 max-w-xs border border-border/50 shadow-sm">
        <p className="text-xs text-muted-foreground font-body text-center leading-relaxed">
          💡 <span className="font-semibold text-foreground">Tip:</span> After the first load,
          the app stays fast. This only happens after a period of inactivity.
        </p>
      </div>
    </div>
  );
};

export default WakeScreen;