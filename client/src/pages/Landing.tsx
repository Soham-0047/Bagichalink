import { useNavigate } from 'react-router-dom';
import { Camera, Sparkles, Globe, Leaf, ArrowRight, Heart, MapPin, Zap, Shield, Users } from 'lucide-react';
import heroImage from '@/assets/hero-plants.jpg';
import scanImage from '@/assets/scan-illustration.jpg';
import communityImage from '@/assets/community-illustration.jpg';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

const AnimatedSection = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });
  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const stats = [
  { value: '180+', label: 'Countries', icon: Globe },
  { value: '50K+', label: 'Plants Shared', icon: Leaf },
  { value: '12K+', label: 'Swaps Made', icon: Heart },
  { value: '25K+', label: 'Gardeners', icon: Users },
];

const features = [
  {
    icon: Camera,
    title: 'AI Plant Scanner',
    description: 'Snap a photo and our AI identifies the species, diagnoses health issues, and gives weather-aware care tips — in seconds.',
    color: 'bg-primary-light',
  },
  {
    icon: Sparkles,
    title: 'Smart Swap Matching',
    description: 'AI analyzes your plants, location, and preferences to find the perfect swap partners in your city or across the globe.',
    color: 'bg-secondary-light',
  },
  {
    icon: MapPin,
    title: 'Hyper-Local Community',
    description: 'Discover plants available in your neighborhood. Weather-aware tips tailored to your exact climate and conditions.',
    color: 'bg-primary-light',
  },
  {
    icon: Shield,
    title: 'Health Reports',
    description: 'Get detailed health diagnoses with severity scoring. Know exactly what your plant needs before you swap or share.',
    color: 'bg-secondary-light',
  },
];

const steps = [
  { num: '01', title: 'Scan Your Plant', desc: 'Take a photo and let AI do the magic — species ID, health check, care tips.', emoji: '📸' },
  { num: '02', title: 'Post to Community', desc: 'Share as Available or mark as Wanted. Your city\'s gardeners will see it instantly.', emoji: '🌱' },
  { num: '03', title: 'Get Matched & Swap', desc: 'AI finds perfect matches. Express interest, connect, and swap plants locally.', emoji: '🤝' },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl">BagichaLink</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#community" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Community</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-body font-medium text-foreground hover:text-primary transition-colors hidden sm:block"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-secondary text-secondary-foreground rounded-pill px-5 py-2.5 text-sm font-body font-semibold transition-all hover:scale-105 active:scale-95 hover:shadow-lg"
            >
              Join Free
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-32 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="space-y-8">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 bg-primary-light rounded-pill px-4 py-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-primary animate-live-pulse" />
                  <span className="text-sm font-tag font-medium text-foreground">Live in 180+ countries</span>
                </div>
              </AnimatedSection>
              <AnimatedSection delay={100}>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-foreground">
                  Your plants deserve <br />
                  <span className="italic text-primary">better than</span><br />
                  <span className="text-secondary">WhatsApp chaos.</span>
                </h1>
              </AnimatedSection>
              <AnimatedSection delay={200}>
                <p className="text-lg md:text-xl font-body text-muted-foreground max-w-lg leading-relaxed">
                  Scan, share, and swap plants with gardeners worldwide. AI-powered diagnosis, weather-aware care tips, and smart matching — all in one beautiful app.
                </p>
              </AnimatedSection>
              <AnimatedSection delay={300}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => navigate('/register')}
                    className="group bg-forest text-forest-foreground rounded-pill px-8 py-4 font-body font-semibold text-base transition-all hover:scale-105 active:scale-95 hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    Start Swapping Free 🌿
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button
                    onClick={() => navigate('/feed')}
                    className="rounded-pill px-8 py-4 font-body font-semibold text-base border-2 border-border text-foreground transition-all hover:border-primary hover:text-primary hover:scale-105 active:scale-95"
                  >
                    Explore Plants
                  </button>
                </div>
              </AnimatedSection>
            </div>

            {/* Right: Hero Image */}
            <AnimatedSection delay={200} className="relative">
              <div className="relative rounded-[2rem] overflow-hidden card-shadow">
                <img
                  src={heroImage}
                  alt="Beautiful collection of potted plants"
                  className="w-full h-[400px] md:h-[500px] object-cover"
                />
                {/* Floating cards */}
                <div className="absolute bottom-6 left-6 right-6 flex gap-3">
                  <div className="bg-background/90 backdrop-blur-sm rounded-card px-4 py-3 card-shadow flex items-center gap-2 animate-fade-up">
                    <span className="text-lg">🌿</span>
                    <div>
                      <p className="text-xs font-tag font-semibold text-foreground">Sweet Basil</p>
                      <p className="text-[0.6rem] font-tag text-muted-foreground">🟢 Healthy · Mumbai 🇮🇳</p>
                    </div>
                  </div>
                  <div className="bg-background/90 backdrop-blur-sm rounded-card px-4 py-3 card-shadow flex items-center gap-2 animate-fade-up" style={{ animationDelay: '150ms' }}>
                    <span className="text-lg">🪴</span>
                    <div>
                      <p className="text-xs font-tag font-semibold text-foreground">Monstera</p>
                      <p className="text-[0.6rem] font-tag text-muted-foreground">Available · NYC 🇺🇸</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative blob */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary-light/40 animate-blob -z-10" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-secondary-light/40 animate-blob -z-10" style={{ animationDelay: '4s' }} />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 border-y border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 100} className="text-center space-y-2">
                <stat.icon className="w-6 h-6 mx-auto text-primary" />
                <p className="font-display text-3xl md:text-4xl text-secondary">{stat.value}</p>
                <p className="text-sm font-tag text-muted-foreground">{stat.label}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <AnimatedSection className="text-center space-y-4 mb-16">
            <span className="text-sm font-tag font-medium text-secondary uppercase tracking-wider">Why BagichaLink?</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">
              Everything your garden needs,<br /><span className="italic text-primary">in your pocket</span>
            </h2>
            <p className="text-muted-foreground font-body max-w-xl mx-auto">
              From AI-powered plant identification to smart swap matching — we make plant parenting magical.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 100}>
                <div className="group bg-background rounded-card card-shadow p-8 space-y-4 transition-all duration-300 hover:-translate-y-1 hover:card-shadow-hover border border-transparent hover:border-border">
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110', feature.color)}>
                    <feature.icon className="w-7 h-7 text-foreground" />
                  </div>
                  <h3 className="font-display text-xl">{feature.title}</h3>
                  <p className="font-body text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28 bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <AnimatedSection className="text-center space-y-4 mb-16">
            <span className="text-sm font-tag font-medium text-secondary uppercase tracking-wider">Simple as 1-2-3</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">
              How it <span className="italic text-primary">works</span>
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <AnimatedSection key={step.num} delay={i * 150}>
                <div className="relative bg-background rounded-card card-shadow p-8 space-y-4 text-center transition-all duration-300 hover:-translate-y-1 hover:card-shadow-hover">
                  <span className="text-5xl block">{step.emoji}</span>
                  <span className="font-display text-4xl text-border block">{step.num}</span>
                  <h3 className="font-display text-xl text-foreground">{step.title}</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="community" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="relative">
                <img
                  src={communityImage}
                  alt="Plant community sharing"
                  className="rounded-[2rem] w-full h-[400px] object-cover card-shadow"
                />
                <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full bg-primary-light/30 animate-blob -z-10" />
              </div>
            </AnimatedSection>
            <AnimatedSection delay={200} className="space-y-6">
              <span className="text-sm font-tag font-medium text-secondary uppercase tracking-wider">Join the Movement</span>
              <h2 className="font-display text-3xl md:text-4xl text-foreground leading-snug">
                A global garden,<br /><span className="italic text-primary">growing together</span>
              </h2>
              <p className="font-body text-muted-foreground leading-relaxed text-lg">
                From Mumbai balconies to New York rooftops, Cape Town courtyards to Tokyo windowsills — gardeners everywhere are sharing, swapping, and growing together.
              </p>
              <div className="flex flex-wrap gap-3">
                {['🇮🇳 India', '🇺🇸 USA', '🇿🇦 South Africa', '🇬🇧 UK', '🇦🇺 Australia', '🇯🇵 Japan', '🇧🇷 Brazil', '🇩🇪 Germany'].map((country) => (
                  <span key={country} className="bg-card rounded-pill px-3 py-1.5 text-xs font-tag text-muted-foreground border border-border">
                    {country}
                  </span>
                ))}
                <span className="bg-primary-light rounded-pill px-3 py-1.5 text-xs font-tag text-foreground font-medium">
                  +172 more
                </span>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* AI Showcase */}
      <section className="py-20 md:py-28 bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection className="space-y-6 order-2 lg:order-1">
              <span className="text-sm font-tag font-medium text-secondary uppercase tracking-wider">Powered by AI</span>
              <h2 className="font-display text-3xl md:text-4xl text-foreground leading-snug">
                Your plant's <span className="italic text-primary">personal doctor</span>
              </h2>
              <p className="font-body text-muted-foreground leading-relaxed text-lg">
                Our AI doesn't just identify your plant — it checks its health, considers your local weather, and gives you care tips tailored to today's conditions.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Zap, text: 'Species identification in under 3 seconds' },
                  { icon: Heart, text: 'Health diagnosis with severity scoring' },
                  { icon: Globe, text: 'Weather-aware daily care tips' },
                  { icon: Sparkles, text: 'Smart swap matching algorithm' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-body text-sm text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
            <AnimatedSection delay={200} className="order-1 lg:order-2">
              <div className="relative flex justify-center">
                <img
                  src={scanImage}
                  alt="AI plant scanning"
                  className="rounded-[2rem] w-72 md:w-80 card-shadow"
                />
                <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-secondary-light/30 animate-blob -z-10" />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <AnimatedSection>
            <div className="relative bg-forest rounded-[2rem] p-12 md:p-16 text-center overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-primary/20 -translate-x-1/2 -translate-y-1/2 animate-blob" />
              <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-secondary/10 translate-x-1/3 translate-y-1/3 animate-blob" style={{ animationDelay: '3s' }} />

              <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                <span className="text-5xl md:text-6xl block">🌿</span>
                <h2 className="font-display text-3xl md:text-4xl text-forest-foreground leading-snug">
                  Ready to grow your garden community?
                </h2>
                <p className="font-body text-forest-foreground/80 text-lg">
                  Join thousands of gardeners sharing plants, knowledge, and joy across the globe.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => navigate('/register')}
                    className="group bg-secondary text-secondary-foreground rounded-pill px-10 py-4 font-body font-semibold text-lg transition-all hover:scale-105 active:scale-95 hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    Join BagichaLink — It's Free
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
                <p className="text-sm font-tag text-forest-foreground/50">
                  No credit card required · Available worldwide
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg">BagichaLink</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#community" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">Community</a>
            </div>
            <p className="text-xs font-tag text-muted-foreground/60">
              © 2026 BagichaLink. Grow together. 🌱
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
