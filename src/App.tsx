import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider, useGame } from "@/contexts/GameContext";
import { MiniKitProvider } from "@/components/MiniKitProvider";
import { TonProvider } from "@/components/TonProvider";
import BottomNav from "@/components/BottomNav";
import XBanner from "@/components/XBanner";

import AppHeader from "@/components/AppHeader";
import LoadingScreen from "@/components/LoadingScreen";
import { ReferralTracker } from "@/components/referral/ReferralTracker";
import Home from "./pages/Home";
import Verify from "./pages/Verify";
import Game from "./pages/Game";
import Result from "./pages/Result";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import About from "./pages/About";
import Live from "./pages/Live";
import LiveLegacy from "./pages/LiveLegacy";
import LiveShow from "./pages/LiveShow";
import LiveCreate from "./pages/LiveCreate";
import LiveMine from "./pages/LiveMine";
import LiveBroadcast from "./pages/LiveBroadcast";
import { useLocation } from "react-router-dom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LIVE_SUBDOMAIN_HOSTS = ['app.jackiechain.world'];

const AppContent = () => {
  const { isLoading } = useGame();
  const location = useLocation();
  const isBroadcast = location.pathname.toLowerCase().startsWith('/live/broadcast');

  // Live is now the root landing — no forced redirect needed.


  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isBroadcast) {
    return (
      <Routes>
        <Route path="/live/broadcast" element={<LiveBroadcast />} />
        <Route path="/LIVE/broadcast" element={<LiveBroadcast />} />
      </Routes>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-50">
        <XBanner />
        <AppHeader />
      </div>
      
      <ReferralTracker />
      <Routes>
        <Route path="/" element={<Live />} />
        <Route path="/about" element={<About />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/game" element={<Home />} />
        <Route path="/play" element={<Game />} />
        <Route path="/result" element={<Result />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/welcome" element={<Verify />} />
        <Route path="/live" element={<Live />} />
        <Route path="/LIVE" element={<Live />} />
        <Route path="/play/legacy" element={<Game />} />
        <Route path="/live/new" element={<LiveCreate />} />
        <Route path="/live/mine" element={<LiveMine />} />
        <Route path="/live/legacy" element={<LiveLegacy />} />
        <Route path="/live/:slug" element={<LiveShow />} />
        <Route path="/live/:slug/edit" element={<LiveCreate />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
};

const App = () => (
  <MiniKitProvider>
    <TonProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <GameProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </GameProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </TonProvider>
  </MiniKitProvider>
);

export default App;
