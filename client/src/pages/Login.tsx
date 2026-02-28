import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginApi, sendOTP, verifyOTPLogin } from '@/lib/api';
import { useApp } from '@/context/AppContext';

type LoginMode = 'password' | 'otp';
type OTPStep = 'email' | 'code';

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useApp();

  // Shared
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password mode
  const [password, setPassword] = useState('');

  // OTP mode
  const [otpStep, setOtpStep] = useState<OTPStep>('email');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((c) => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
    }, 1000);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginApi(email, password);
      if (res.data?.token) {
        localStorage.setItem('bagichalink_token', res.data.token);
        setUser(res.data.user);
        navigate('/feed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email.'); return; }
    setError('');
    setLoading(true);
    try {
      await sendOTP(email, 'login');
      setOtpStep('code');
      startCooldown();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    }
    setLoading(false);
  };

  const handleOTPLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setError('Please enter the 6-digit code.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await verifyOTPLogin(email, otp);
      if (res.data?.token) {
        localStorage.setItem('bagichalink_token', res.data.token);
        setUser(res.data.user);
        navigate('/feed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center space-y-2">
          <div className="text-8xl mb-4">🌿</div>
          <h1 className="font-display italic text-2xl text-foreground">
            Your plants deserve better than WhatsApp chaos.
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Join gardeners in 180+ countries swapping plants.
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1 bg-card rounded-pill p-1">
          <button onClick={() => { setMode('password'); setError(''); }}
            className={`flex-1 py-2 rounded-pill text-sm font-tag font-medium transition-all ${mode === 'password' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
            Password
          </button>
          <button onClick={() => { setMode('otp'); setError(''); setOtpStep('email'); }}
            className={`flex-1 py-2 rounded-pill text-sm font-tag font-medium transition-all ${mode === 'otp' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
            Email OTP ✨
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-card px-4 py-3 text-sm font-body">
            {error}
          </div>
        )}

        {/* Password Login */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" required
              className="w-full bg-transparent border-0 border-b-2 border-border py-3 text-base font-body placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" required
              className="w-full bg-transparent border-0 border-b-2 border-border py-3 text-base font-body placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-forest text-forest-foreground rounded-pill font-body font-semibold text-base transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In 🌿'}
            </button>
          </form>
        )}

        {/* OTP Login */}
        {mode === 'otp' && otpStep === 'email' && (
          <form onSubmit={handleSendOTP} className="space-y-5">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address" required
              className="w-full bg-transparent border-0 border-b-2 border-border py-3 text-base font-body placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-forest text-forest-foreground rounded-pill font-body font-semibold text-base transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50">
              {loading ? 'Sending code...' : 'Send OTP to Email 📧'}
            </button>
          </form>
        )}

        {mode === 'otp' && otpStep === 'code' && (
          <form onSubmit={handleOTPLogin} className="space-y-5">
            <p className="text-sm text-center text-muted-foreground font-body">
              Code sent to <strong>{email}</strong>
            </p>
            {/* OTP boxes */}
            <div className="flex gap-2 justify-center">
              {[0,1,2,3,4,5].map((i) => (
                <input key={i} type="text" inputMode="numeric" maxLength={1}
                  id={`login-otp-${i}`}
                  value={otp[i] || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const arr = otp.split('');
                    arr[i] = val;
                    setOtp(arr.join(''));
                    if (val && i < 5) document.getElementById(`login-otp-${i+1}`)?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0)
                      document.getElementById(`login-otp-${i-1}`)?.focus();
                  }}
                  className="w-11 h-14 text-center text-xl font-display font-semibold bg-card border-2 border-border rounded-card focus:outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>
            <button type="submit" disabled={loading || otp.length < 6}
              className="w-full py-3.5 bg-forest text-forest-foreground rounded-pill font-body font-semibold text-base transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify & Sign In 🌿'}
            </button>
            <div className="text-center space-y-1">
              <button type="button" onClick={() => { setOtp(''); sendOTP(email, 'login'); startCooldown(); }}
                disabled={resendCooldown > 0}
                className="text-sm font-body text-muted-foreground hover:text-foreground disabled:opacity-40">
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
              <br/>
              <button type="button" onClick={() => { setOtpStep('email'); setOtp(''); setError(''); }}
                className="text-xs font-body text-muted-foreground hover:text-foreground">
                ← Change email
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm font-body">
          <span className="text-muted-foreground">New here? </span>
          <button onClick={() => navigate('/register')} className="text-secondary font-medium hover:underline">
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;