import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Camera, Sparkles, User, Leaf, Map, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/feed', icon: Home, label: 'Home' },
  { path: '/explore', icon: Search, label: 'Explore' },
  { path: '/scan', icon: Camera, label: 'Scan', isFab: true },
  { path: '/matches', icon: Sparkles, label: 'Matches' },
  { path: '/map', icon: Map, label: 'Plant Map' },
  { path: '/chat', icon: MessageSquare, label: 'Messages' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const hiddenRoutes = ['/', '/login', '/register'];

const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center transition-transform group-hover:scale-110">
          <Leaf className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-display text-xl text-foreground">BagichaLink</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isFab) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 my-3 rounded-pill bg-secondary text-secondary-foreground font-body font-semibold transition-all duration-200 hover:scale-[1.03] hover:shadow-lg active:scale-95"
              >
                <Icon className="w-5 h-5" />
                <span>{item.label} Plant</span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-card font-body text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary-light text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground hover:translate-x-1'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-border">
        <p className="text-xs font-tag text-muted-foreground">🌿 BagichaLink</p>
        <p className="text-[0.65rem] font-tag text-muted-foreground/60 mt-0.5">Global Plant Swap Community</p>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
