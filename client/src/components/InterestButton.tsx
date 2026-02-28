import { useState } from 'react';
import { Heart } from 'lucide-react';

interface InterestButtonProps {
  count: number;
  isInterested: boolean;
  onToggle: () => void;
  fullWidth?: boolean;
}

const InterestButton = ({ count, isInterested, onToggle, fullWidth = false }: InterestButtonProps) => {
  const [bouncing, setBouncing] = useState(false);

  const handleClick = () => {
    setBouncing(true);
    onToggle();
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setBouncing(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-pill font-body font-medium transition-all active:scale-95 ${
        fullWidth ? 'w-full justify-center py-3.5 text-base' : 'px-4 py-2 text-sm'
      } ${
        isInterested
          ? 'bg-secondary text-secondary-foreground'
          : 'bg-forest text-forest-foreground hover:bg-forest/90'
      }`}
    >
      <Heart
        className={`w-4 h-4 transition-transform ${
          bouncing ? 'animate-count-bounce' : ''
        } ${isInterested ? 'fill-current' : ''}`}
      />
      {isInterested ? 'Interested' : "I'm Interested →"}
      <span className={`font-tag text-xs ${bouncing ? 'animate-count-bounce' : ''}`}>
        {count}
      </span>
    </button>
  );
};

export default InterestButton;
