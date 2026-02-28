import { Share2, Copy, MessageCircle, Heart } from 'lucide-react';
import { useRef } from 'react';
import type { AIAnalysis } from '@/types';

interface ShareCardProps {
  plant: AIAnalysis;
  image: string;
  city?: string;
}

const ShareCard = ({ plant, image, city }: ShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const generateShareImage = async () => {
    try {
      // Dynamic import html2canvas - user needs to install it
      const html2canvas = (await import('html2canvas')).default;
      if (!cardRef.current) return null;
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#f2f0eb',
        scale: 2,
      });
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Error generating share image (html2canvas not installed):', e);
      alert('Download failed. Please install html2canvas package: bun add html2canvas');
      return null;
    }
  };

  const shareToWhatsApp = async () => {
    const text = `I just discovered this amazing plant! 🌿\n\n${plant.emoji} ${plant.commonName}\n${plant.diagnosis}\n\nHealth: ${plant.healthStatus || 'Unknown'}\nCare Level: ${plant.careLevel || 'Unknown'}\n\nShared via BagichaLink 🌱`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareToInstagram = async () => {
    const shareImage = await generateShareImage();
    if (shareImage) {
      const link = document.createElement('a');
      link.href = shareImage;
      link.download = `${plant.commonName}-bagichalink.png`;
      link.click();
      alert('Image downloaded! Paste it in Instagram.');
    }
  };

  const copyToClipboard = async () => {
    const text = `✨ I found a ${plant.emoji} ${plant.commonName}! ✨\n\n${plant.diagnosis}\n\n💡 Care Tips:\n• ${plant.careLevel || 'Moderate'} difficulty\n• ${plant.wateringFrequency || 'Regular'} watering\n• ${plant.sunlight || 'Bright light'} environment\n\n🌟 ${plant.funFact}\n\nDon't miss out on plant swaps! Download BagichaLink 🌿`;
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard! 📋');
  };

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <div
        ref={cardRef}
        className="rounded-card overflow-hidden bg-gradient-to-br from-primary-light to-secondary-light p-6 max-w-sm mx-auto"
      >
        <div className="bg-white rounded-lg p-4 space-y-4">
          {image && (
            <img
              src={image}
              alt={plant.commonName}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}

          <div className="space-y-2">
            <h3 className="font-display text-xl">
              {plant.emoji} {plant.commonName}
            </h3>
            <p className="text-sm italic text-muted-foreground font-body">
              {plant.species}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-tag font-semibold text-foreground">HEALTH STATUS</p>
            <p className="text-sm font-body">{plant.diagnosis}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-primary-light/20 rounded p-2">
              <p className="font-tag font-semibold">Care Level</p>
              <p className="text-sm capitalize">{plant.careLevel || 'Unknown'}</p>
            </div>
            <div className="bg-secondary-light/20 rounded p-2">
              <p className="font-tag font-semibold">Watering</p>
              <p className="text-sm">{plant.wateringFrequency || 'Regular'}</p>
            </div>
          </div>

          <p className="text-xs italic text-muted-foreground pt-2 border-t border-border">
            ✨ {plant.funFact || 'An amazing plant for your garden!'}
          </p>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-tag text-muted-foreground">
              Shared via BagichaLink 🌿
            </span>
            <div className="flex gap-2">
              <Heart className="w-4 h-4" />
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={shareToWhatsApp}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-pill text-sm font-tag font-semibold hover:bg-green-700 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          onClick={shareToInstagram}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-pill text-sm font-tag font-semibold hover:opacity-90 transition-opacity"
        >
          <Share2 className="w-4 h-4" />
          Instagram
        </button>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-pill text-sm font-tag font-semibold hover:opacity-90 transition-opacity"
        >
          <Copy className="w-4 h-4" />
          Copy Text
        </button>
      </div>
    </div>
  );
};

export default ShareCard;
