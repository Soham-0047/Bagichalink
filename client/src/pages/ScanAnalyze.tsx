import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, X, ArrowLeft } from 'lucide-react';
import { analyzePlant, createPost } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import LoadingBlob from '@/components/LoadingBlob';
import HealthBadge from '@/components/HealthBadge';
import HealthStatusBar from '@/components/HealthStatusBar';
import TypeBadge from '@/components/TypeBadge';
import confetti from 'canvas-confetti';
import type { AIAnalysis } from '@/types';

type Step = 'upload' | 'analyzing' | 'result';

const cyclingTexts = [
  'Identifying species...',
  "Checking today's weather...",
  'Analyzing plant health...',
  'Generating care tips...',
];

const ScanAnalyze = () => {
  const navigate = useNavigate();
  const { location, weather } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string>('');

  // Cycling text animation
  useEffect(() => {
    if (step !== 'analyzing') return;
    const interval = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % cyclingTexts.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [step]);

  const handleFileSelect = (file: File) => {
    setError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    startAnalysis(file);
  };

  const startAnalysis = async (file: File) => {
    setStep('analyzing');
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (location) {
        formData.append('lat', String(location.lat));
        formData.append('lon', String(location.lon));
        formData.append('city', location.city);
        formData.append('country', location.country);
      }
      const res = await analyzePlant(formData);
      
      // Parse response - the analysis data is at res.data.data
      const analysisData = res.data?.data || res.data?.aiAnalysis || res.data?.analysis;
      const uploadedImageUrl = res.data?.imageUrl;
      
      if (!analysisData || !analysisData.commonName) {
        throw new Error('Invalid analysis response - missing plant data');
      }
      
      setAnalysis(analysisData);
      setImageUrl(uploadedImageUrl || imagePreview);
      setStep('result');
    } catch (e) {
      console.error('Analysis failed:', e);
      const errorMsg = e.response?.data?.message || e.message || 'Failed to analyze image. Please try again.';
      setError(errorMsg);
      setStep('upload');
    }
  };

  const handlePost = async (type: 'available' | 'wanted') => {
    if (!analysis || !imageFile) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('image', imageFile); // Send the actual image file
      formData.append('aiAnalysis', JSON.stringify(analysis));
      formData.append('tags', JSON.stringify(analysis.tags || []));
      formData.append('title', analysis.species?.commonName || 'My Plant');
      if (location) {
        formData.append('lat', String(location.lat));
        formData.append('lon', String(location.lon));
        formData.append('city', location.city);
        formData.append('country', location.country);
        formData.append('countryCode', location.countryCode);
      }
      const res = await createPost(formData);
      if (res.data?.success || res.data?.data) {
        // Confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          colors: ['#5C7A4E', '#C4714A', '#D6E8C8', '#F2D5C4'],
          origin: { y: 0.7 },
        });
        // Delay to show confetti, then navigate to feed
        setTimeout(() => navigate('/feed'), 2000);
      } else {
        alert('Post created but response unclear. Redirecting...');
        setTimeout(() => navigate('/feed'), 1000);
      }
    } catch (e) {
      console.error('Post creation failed:', e);
      const errorMsg = e.response?.data?.message || e.message || 'Unknown error';
      if (e.response?.status === 401) {
        alert('Your session expired. Please log in again.');
        navigate('/login');
      } else {
        alert(`Failed to create post: ${errorMsg}`);
      }
    }
    setPosting(false);
  };

  if (step === 'analyzing') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
        <LoadingBlob />
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="text-6xl mb-6">{analysis?.species?.emoji || '🌿'}</div>
          <p className="font-body text-lg text-foreground animate-text-cycle" key={cycleIndex}>
            {cyclingTexts[cycleIndex]}
          </p>
          <div className="w-48 h-1 bg-border rounded-pill mt-6 overflow-hidden">
            <div className="h-full bg-primary rounded-pill animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'result' && analysis) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <div className="max-w-[480px] lg:max-w-3xl mx-auto">
          {/* Plant Image */}
          <div className="relative h-52">
            <img src={imageUrl || imagePreview} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => { setStep('upload'); setAnalysis(null); setError(''); }}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="absolute top-4 right-4">
              <HealthBadge status={analysis.health?.status || 'healthy'} />
            </div>
            <div className="absolute bottom-4 left-4 text-4xl">
              {analysis.species?.emoji || '🌿'}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Species */}
            <div className="space-y-1">
              <h1 className="font-display text-2xl">{analysis.species?.commonName}</h1>
              <p className="text-sm text-muted-foreground italic font-body">
                {analysis.species?.scientificName}
              </p>
            </div>

            {/* Fun fact */}
            {analysis.species?.funFact && (
              <div className="bg-card rounded-card p-4 border-l-[3px] border-secondary">
                <p className="text-sm italic text-muted-foreground font-body">
                  {analysis.species.funFact}
                </p>
              </div>
            )}

            {/* Care pills */}
            <div className="flex gap-2">
              {analysis.care?.level && (
                <span className="bg-primary-light text-foreground rounded-pill px-3 py-1.5 text-xs font-tag">
                  ⚡ {analysis.care.level}
                </span>
              )}
              {analysis.care?.watering && (
                <span className="bg-primary-light text-foreground rounded-pill px-3 py-1.5 text-xs font-tag">
                  💧 {analysis.care.watering}
                </span>
              )}
            </div>

            {/* Health Report */}
            <div className="space-y-3">
              <h3 className="font-body font-semibold text-base">Health Report 🔍</h3>
              <p className="text-sm font-body text-foreground">{analysis.health?.diagnosis}</p>
              <HealthStatusBar score={analysis.health?.score || 80} />
            </div>

            {/* Tips */}
            {analysis.care?.tips && analysis.care.tips.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-body font-semibold text-base">
                  Tips for Today {weather ? `${weather.condition}` : ''}
                </h3>
                {analysis.care.tips.slice(0, 3).map((tip, i) => (
                  <div key={i} className="flex gap-3 bg-card rounded-card p-3.5 border-l-[3px] border-secondary">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-tag font-semibold">
                      {i + 1}
                    </span>
                    <p className="text-sm font-body">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            {analysis.tags && analysis.tags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {analysis.tags.map((tag, i) => (
                  <span key={i} className="bg-primary-light text-foreground rounded-pill px-3 py-1 text-xs font-tag whitespace-nowrap">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3 pt-2 pb-8">
              <button
                onClick={() => handlePost('available')}
                disabled={posting}
                className="w-full py-3.5 bg-forest text-forest-foreground rounded-pill font-body font-semibold text-base transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {posting ? '📤 Posting...' : '🌱 Post as Available'}
              </button>
              <button
                onClick={() => handlePost('wanted')}
                disabled={posting}
                className="w-full py-3.5 bg-background text-primary border-2 border-primary rounded-pill font-body font-semibold text-base transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {posting ? '📤 Posting...' : '🔍 Post as Wanted'}
              </button>
              <button className="w-full text-center text-sm text-muted-foreground font-body hover:text-foreground">
                Save to My Garden
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Upload step
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="max-w-[480px] lg:max-w-3xl mx-auto px-4 lg:px-8 pt-6 pb-24 lg:pb-8">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center mb-8 space-y-2">
          <h1 className="font-display text-2xl">Scan Your Plant</h1>
          <p className="text-sm text-muted-foreground font-body">
            AI will diagnose it and match it for swap
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-card p-4 mb-6">
            <p className="text-sm text-red-700 font-body">{error}</p>
          </div>
        )}

        {imagePreview ? (
          <div className="relative rounded-card overflow-hidden mb-6">
            <img src={imagePreview} alt="Preview" className="w-full aspect-square object-cover" />
            <button
              onClick={() => { setImagePreview(''); setImageFile(null); setError(''); }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="aspect-square rounded-card bg-card card-shadow flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-0.5 hover:card-shadow-hover active:scale-95"
            >
              <Camera className="w-12 h-12 text-primary" />
              <span className="font-body font-medium text-sm">Take Photo</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-card bg-card card-shadow flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-0.5 hover:card-shadow-hover active:scale-95"
            >
              <Upload className="w-12 h-12 text-primary" />
              <span className="font-body font-medium text-sm">Upload Photo</span>
            </button>
          </div>
        )}

        {location && (
          <p className="text-xs text-muted-foreground text-center font-tag">
            📍 Using your location for weather-aware tips
          </p>
        )}
        {!location && (
          <p className="text-xs text-muted-foreground text-center font-tag">
            Location unavailable — tips will be general
          </p>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
      </div>
    </div>
  );
};

export default ScanAnalyze;
