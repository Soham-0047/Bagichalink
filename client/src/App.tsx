import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import FloatingNav from "@/components/FloatingNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import Landing from "./pages/Landing";
import HomeFeed from "./pages/HomeFeed";
import ScanAnalyze from "./pages/ScanAnalyze";
import PostDetail from "./pages/PostDetail";
import Matches from "./pages/Matches";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const fullPageRoutes = ['/', '/login', '/register'];

const AppLayout = () => {
  const location = useLocation();
  const isFullPage = fullPageRoutes.includes(location.pathname);

  return (
    <>
      {!isFullPage && <DesktopSidebar />}
      <div className={isFullPage ? '' : 'lg:pl-64'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/feed" element={<HomeFeed />} />
          <Route path="/explore" element={<HomeFeed />} />
          <Route path="/scan" element={<ScanAnalyze />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!isFullPage && <FloatingNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
