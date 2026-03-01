import { useEffect, useState } from 'react';
import { X, Leaf, Clock, Zap, Heart } from 'lucide-react';

interface RateLimitInfo {
  endpoint: 'analyze' | 'match' | 'schedule';
  retryAfter: number;  // seconds
  limit: number;
  windowHours: number;
  message?: string;
}

interface RateLimitModalProps {
  info: RateLimitInfo | null;
  onClose: () => void;
}

const ENDPOINT_COPY = {
  analyze: {
    icon: '🔬',
    title: 'Plant Scan Limit Reached',
    what: 'AI plant scans',
    tip: 'Your scans are being used to power Gemini AI — each photo costs real compute on free tier.',
  },
  match: {
    icon: '✨',
    title: 'Match Limit Reached',
    what: 'AI swap matches',
    tip: 'Matching compares your plant against dozens of others using AI — it adds up fast on free tier.',
  },
  schedule: {
    icon: '📅',
    title: 'Care Schedule Limit Reached',
    what: 'care schedule generations',
    tip: 'Your schedule is saved — you can view it anytime without regenerating.',
  },
};

// Format seconds into human-readable countdown
const formatTime = (secs: number) => {
  if (secs <= 0) return '0s';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};

const RateLimitModal = ({ info, onClose }: RateLimitModalProps) => {
  const [secondsLeft, setSecondsLeft] = useState(info?.retryAfter ?? 0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (info) {
      setSecondsLeft(info.retryAfter);
      // Small delay for enter animation
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    }
  }, [info]);

  // Countdown timer
  useEffect(() => {
    if (!info || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [info, secondsLeft]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  if (!info) return null;

  const copy     = ENDPOINT_COPY[info.endpoint];
  const progress = Math.max(0, secondsLeft / info.retryAfter);
  const isDone   = secondsLeft === 0;

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4 transition-all duration-300 ${
        visible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-sm bg-background rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Decorative top gradient */}
        <div className="h-2 w-full" style={{
          background: 'linear-gradient(90deg, hsl(105 40% 60%), hsl(36 60% 65%), hsl(155 35% 55%))'
        }} />

        {/* Progress bar — drains as countdown ticks */}
        <div className="h-1 w-full bg-border">
          <div
            className="h-full bg-primary/40 transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="p-6 space-y-5">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Icon + title */}
          <div className="flex items-start gap-4 pr-8">
            <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">
              {copy.icon}
            </div>
            <div>
              <h2 className="font-display text-lg leading-tight">{copy.title}</h2>
              <p className="text-xs text-muted-foreground font-tag mt-0.5">
                Free tier · {info.limit} {copy.what}/{info.windowHours}h per user
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className={`rounded-2xl p-4 flex items-center gap-4 border transition-colors ${
            isDone
              ? 'bg-green-50 border-green-200'
              : 'bg-card border-border'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDone ? 'bg-green-100' : 'bg-primary-light'
            }`}>
              <Clock className={`w-5 h-5 ${isDone ? 'text-green-600' : 'text-primary'}`} />
            </div>
            <div className="flex-1">
              {isDone ? (
                <p className="text-sm font-semibold text-green-700 font-body">
                  ✅ Ready! You can try again now.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground font-tag">Resets in</p>
                  <p className="font-display text-2xl text-foreground leading-tight">
                    {formatTime(secondsLeft)}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Why box */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-amber-700 font-tag uppercase tracking-wide">Why this limit?</span>
            </div>
            <p className="text-xs text-amber-800 font-body leading-relaxed">
              {copy.tip} Limits reset every {info.windowHours} hour{info.windowHours > 1 ? 's' : ''}.
            </p>
          </div>

          {/* Free tier note */}
          <div className="flex items-center gap-2.5 px-1">
            <Heart className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-muted-foreground font-body">
              BagichaLink is <span className="font-semibold text-foreground">100% free</span> — limits keep the AI running for everyone 🌿
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {isDone ? (
              <button
                onClick={handleClose}
                className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-pill font-body font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95"
              >
                Try Again 🚀
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 bg-card border border-border text-foreground rounded-pill font-body font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Got it
                </button>
                <button
                  onClick={() => { handleClose(); }}
                  className="flex-1 py-3 bg-primary-light text-foreground rounded-pill font-body font-semibold text-sm hover:bg-primary/20 transition-colors"
                >
                  Browse Plants 🌱
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateLimitModal;