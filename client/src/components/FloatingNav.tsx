import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Camera, Bell, User, MessageSquare } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useState, useEffect } from 'react';
import { getNotifications } from '@/lib/api';

const tabs = [
  { path: '/feed',          icon: Home,          label: 'Home'    },
  { path: '/explore',       icon: Search,        label: 'Explore' },
  { path: '/scan',          icon: Camera,        label: 'Scan', isFab: true },
  { path: '/notifications', icon: Bell,          label: 'Alerts'  },
  { path: '/profile',       icon: User,          label: 'Profile' },
];

const hiddenRoutes = ['/', '/login', '/register'];

const FloatingNav = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { socket, user } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial unread count when user is logged in
  useEffect(() => {
    if (!user) return;
    getNotifications()
      .then((res) => setUnreadCount(res.data?.data?.unreadCount || 0))
      .catch(() => {});
  }, [user]);

  // Real-time: bump badge on new notification
  useEffect(() => {
    if (!socket) return;
    const handler = () => setUnreadCount((c) => c + 1);
    socket.on('new_notification', handler);
    return () => { socket.off('new_notification', handler); };
  }, [socket]);

  // Reset badge when user visits notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-forest rounded-pill px-6 py-2 nav-shadow lg:hidden">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;

        if (tab.isFab) {
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative -mt-8 mx-2 w-14 h-14 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110 active:scale-90"
            >
              <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-fab-pulse" />
              <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-fab-pulse" style={{ animationDelay: '1s' }} />
              <Icon className="w-6 h-6 relative z-10" />
            </button>
          );
        }

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              isActive
                ? 'bg-forest-foreground/15 text-forest-foreground scale-110'
                : 'text-forest-foreground/60 hover:text-forest-foreground/80 hover:scale-105'
            }`}
          >
            <Icon className="w-5 h-5" />
            {/* Notification badge */}
            {tab.path === '/notifications' && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default FloatingNav;