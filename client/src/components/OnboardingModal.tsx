import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface OnboardingProps {
  open: boolean;
  onClose: () => void;
}

const OnboardingModal = ({ open, onClose }: OnboardingProps) => {
  const { setLocation } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    plants: [] as string[],
    looking: [] as string[],
    experience: '',
  });

  const plantOptions = ['Succulents', 'Herbs', 'Vegetables', 'Flowering', 'Climbing', 'Trees'];
  const lookingOptions = ['Succulents', 'Herbs', 'Vegetables', 'Flowering', 'Rare Plants', 'Seeds'];
  const experienceOptions = [
    { id: 'beginner', label: 'Beginner 🌱', desc: 'Just starting out' },
    { id: 'intermediate', label: 'Intermediate 🌿', desc: 'Some experience' },
    { id: 'expert', label: 'Expert 🌳', desc: 'Master gardener' },
  ];

  const toggleSelection = (value: string, key: 'plants' | 'looking') => {
    setAnswers(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(p => p !== value)
        : [...prev[key], value]
    }));
  };

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
    else onClose();
  };

  const canContinue = () => {
    if (step === 0) return answers.plants.length > 0;
    if (step === 1) return answers.looking.length > 0;
    if (step === 2) return answers.experience !== '';
    return false;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-card w-full max-w-md max-h-[90vh] card-shadow p-6 space-y-6 my-auto">
        {/* Progress */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-pill transition-colors ${
                i <= step ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Step 0: What plants do you have? */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="font-display text-xl">What plants do you have? 🌱</h2>
              <p className="text-sm text-muted-foreground font-body">Select at least one</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {plantOptions.map((plant) => (
                <button
                  key={plant}
                  onClick={() => toggleSelection(plant, 'plants')}
                  className={`py-3 px-3 rounded-lg text-sm font-tag font-medium transition-all ${
                    answers.plants.includes(plant)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:bg-background'
                  }`}
                >
                  {plant}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: What are you looking for? */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="font-display text-xl">What are you looking for? 🔍</h2>
              <p className="text-sm text-muted-foreground font-body">Select at least one</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {lookingOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleSelection(item, 'looking')}
                  className={`py-3 px-3 rounded-lg text-sm font-tag font-medium transition-all ${
                    answers.looking.includes(item)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:bg-background'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Your experience level */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="font-display text-xl">Your experience level? 📈</h2>
              <p className="text-sm text-muted-foreground font-body">This helps us give better tips</p>
            </div>
            <div className="space-y-2">
              {experienceOptions.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => setAnswers({ ...answers, experience: exp.id })}
                  className={`w-full p-3.5 rounded-lg text-left transition-all ${
                    answers.experience === exp.id
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                      : 'bg-card border border-border hover:bg-background'
                  }`}
                >
                  <div className="font-tag font-semibold">{exp.label}</div>
                  <div className="text-xs opacity-80">{exp.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleNext}
          disabled={!canContinue()}
          className="w-full py-3 bg-secondary text-secondary-foreground rounded-pill font-body font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {step === 2 ? 'Get Started 🚀' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Skip */}
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground font-body transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;
