import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP, registerWithOTP, searchCities } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { countryFlag } from '@/lib/helpers';
import type { CitySearchResult } from '@/types';

type Step = 'details' | 'otp';

const Register = () => {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [selectedCity, setSelectedCity] = useState<CitySearchResult | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // City search
  useEffect(() => {
    if (!cityQuery || cityQuery.length < 2) { setCityResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await searchCities(cityQuery);
        setCityResults((res.data?.data || res.data || []).map((r: any) => ({ ...r, city: r.name || r.city })));
      } catch { setCityResults([]); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [cityQuery]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) { setError('Please fill in your name and email.'); return; }
    if (!selectedCity) { setError('Please select your city.'); return; }
    setError('');
    setLoading(true);
    try {
      await sendOTP(email, 'register', name);
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await registerWithOTP({
        name,
        email,
        otp,
        location: selectedCity ? {
          city: selectedCity.city || selectedCity.name || '',
          country: selectedCity.country,
          countryCode: selectedCity.countryCode,
          lat: selectedCity.lat,
          lon: selectedCity.lon,
        } : undefined,
      });
      if (res.data?.token) {
        localStorage.setItem('bagichalink_token', res.data.token);
        setUser(res.data.user);
        navigate('/feed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await sendOTP(email, 'register', name);
      setResendCooldown(60);
      setError('');
    } catch (err: any) {
      setError('Failed to resend. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-6xl">{step === 'otp' ? '📬' : '🌱'}</div>
          <h1 className="font-display italic text-2xl text-foreground">
            {step === 'otp' ? 'Check your email' : 'Join the Garden Community'}
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            {step === 'otp'
              ? `We sent a 6-digit code to ${email}`
              : 'Swap plants with gardeners worldwide 🌍'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-card px-4 py-3 text-sm font-body">
            {error}
          </div>
        )}

        {/* Step 1: Details */}
        {step === 'details' && (
          <form onSubmit={handleSendOTP} className="space-y-5">
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name" required
              className="w-full bg-transparent border-0 border-b-2 border-border py-3 text-base font-body placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address" required
              className="w-full bg-transparent border-0 border-b-2 border-border py-3 text-base font-body placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />

            {/* City search */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-tag">Where are you gardening from? 🌍</p>
              {selectedCity ? (
                <div className="flex items-center gap-2 bg-primary-light rounded-pill px-4 py-2">
                  <span>{countryFlag(selectedCity.countryCode)}</span>
                  <span className="text-sm font-body flex-1">{selectedCity.city || selectedCity.name}, {selectedCity.country}</span>
                  <button type="button" onClick={() => { setSelectedCity(null); setCityQuery(''); }} className="text-muted-foreground text-xs hover:text-foreground">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text" value={cityQuery} onChange={(e) => setCityQuery(e.target.value)}
                    placeholder="Search your city..."
                    className="w-full bg-card rounded-card border border-border py-3 px-4 text-sm font-body placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  {cityResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-card mt-1 max-h-48 overflow-y-auto z-50 shadow-lg">
                      {cityResults.map((city, i) => (
                        <button key={i} type="button"
                          onClick={() => { setSelectedCity(city); setCityQuery(''); setCityResults([]); }}
                          className="w-full text-left px-4 py-3 text-sm font-body hover:bg-card flex items-center gap-2 border-b border-border last:border-0">
                          <span>{countryFlag(city.countryCode)}</span>
                          <span>{city.name || city.city}, {city.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-secondary text-secondary-foreground rounded-pill font-body font-semibold text-base transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50">
              {loading ? 'Sending code...' : 'Send Verification Code 📧'}
            </button>
          </form>
        )}

        {/* Step 2: OTP input */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            {/* OTP input - big digits */}
            <div className="flex gap-2 justify-center">
              {[0,1,2,3,4,5].map((i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i] || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const newOtp = otp.split('');
                    newOtp[i] = val;
                    setOtp(newOtp.join(''));
                    // Auto-focus next
                    if (val && i < 5) {
                      const next = document.getElementById(`otp-${i+1}`);
                      next?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) {
                      const prev = document.getElementById(`otp-${i-1}`);
                      prev?.focus();
                    }
                  }}
                  id={`otp-${i}`}
                  className="w-11 h-14 text-center text-xl font-display font-semibold bg-card border-2 border-border rounded-card focus:outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>

            <button type="submit" disabled={loading || otp.length < 6}
              className="w-full py-3.5 bg-forest text-forest-foreground rounded-pill font-body font-semibold text-base transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify & Create Account 🌿'}
            </button>

            {/* Resend */}
            <div className="text-center space-y-2">
              <button type="button" onClick={handleResend} disabled={resendCooldown > 0}
                className="text-sm font-body text-muted-foreground hover:text-foreground disabled:opacity-40">
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
              <br />
              <button type="button" onClick={() => { setStep('details'); setOtp(''); setError(''); }}
                className="text-xs font-body text-muted-foreground hover:text-foreground">
                ← Change email
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm font-body">
          <span className="text-muted-foreground">Already have an account? </span>
          <button onClick={() => navigate('/login')} className="text-secondary font-medium hover:underline">Sign in</button>
        </p>
      </div>
    </div>
  );
};

export default Register;