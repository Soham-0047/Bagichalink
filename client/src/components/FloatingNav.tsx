import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Sparkles, Camera, Bell, User, Map, MessageSquare } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useState, useEffect } from 'react';
import { getNotifications } from '@/lib/api';

const tabs = [
  { path: '/feed',          icon: Home,          label: 'Home'    },
  { path: '/map',           icon: Map,           label: 'Map'     },
  { path: '/matches',       icon: Sparkles,      label: 'Matches' },
  { path: '/scan',          icon: Camera,        label: 'Scan',   isFab: true },
  { path: '/chat',          icon: MessageSquare, label: 'Chat'    },
  { path: '/notifications', icon: Bell,          label: 'Alerts', hasBadge: true },
  { path: '/profile',       icon: User,          label: 'Me'      },
];

const hiddenRoutes = ['/', '/login', '/register'];

const FloatingNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, user } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    getNotifications()
      .then((res) => setUnreadCount(res.data?.data?.unreadCount || 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => setUnreadCount((c) => c + 1);
    socket.on('new_notification', handler);
    return () => { socket.off('new_notification', handler); };
  }, [socket]);

  useEffect(() => {
    if (location.pathname === '/notifications') setUnreadCount(0);
  }, [location.pathname]);

  if (hiddenRoutes.includes(location.pathname)) return null;

  // Hide on individual chat rooms so nav never covers input box
  if (location.pathname.startsWith('/chat/')) return null;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Same solid bg-forest as original — no glassmorphism */}
        <div className="mx-3 mb-3 bg-forest rounded-pill nav-shadow">
          <div className="flex items-center justify-around px-2 py-1.5">
            {tabs.map((tab) => {
              const isActive =
                location.pathname === tab.path ||
                (tab.path === '/chat' && location.pathname.startsWith('/chat'));
              const Icon = tab.icon;

              if (tab.isFab) {
                return (
                  <button
                    key={tab.path}
                    onClick={() => navigate(tab.path)}
                    className="relative -mt-6 flex-shrink-0 w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-lg border-2 border-background transition-transform duration-200 hover:scale-110 active:scale-90"
                  >
                    <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-fab-pulse" />
                    <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-fab-pulse" style={{ animationDelay: '1s' }} />
                    <Icon className="w-5 h-5 relative z-10" />
                  </button>
                );
              }

              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-full transition-all duration-200 flex-1 max-w-[48px] ${
                    isActive
                      ? 'bg-forest-foreground/15 text-forest-foreground'
                      : 'text-forest-foreground/60 hover:text-forest-foreground/80'
                  }`}
                >
                  <Icon style={{ width: '18px', height: '18px' }} />
                  <span className="text-[9px] font-medium leading-none">{tab.label}</span>

                  {/* Notification badge */}
                  {tab.hasBadge && unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind nav */}
      <div className="h-24 lg:hidden" aria-hidden="true" />
    </>
  );
};

export default FloatingNav;