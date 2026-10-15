import { lazy, Suspense, useCallback, useState, memo } from 'react';
import { Ban } from 'lucide-react';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PointsProvider } from '@/context/PointsContext';
import BottomNav from '@/components/BottomNav';
import { BannerAd } from '@/components/AdContainer';

const Home = lazy(() => import('@/screens/Home'));
const WalletScreen = lazy(() => import('@/screens/Wallet'));
const Profile = lazy(() => import('@/screens/Profile'));
const DailyTasks = lazy(() => import('@/screens/DailyTasks'));
const InviteFriends = lazy(() => import('@/screens/InviteFriends'));
const AdminPanel = lazy(() => import('@/screens/AdminPanel'));
const AuthScreen = lazy(() => import('@/screens/AuthScreen'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center" dir="rtl">
      <img
        src="/icon-192.png"
        alt="Profit Spectator"
        width="64"
        height="64"
        fetchPriority="high"
        className="w-16 h-16 rounded-2xl object-cover animate-pulse neon-gold"
      />
    </div>
  );
}

function BannedScreen() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6" dir="rtl">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <Ban className="text-red-500" size={40} />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">تم حظر حسابك</h1>
        <p className="text-zinc-500 text-sm mb-6">تم حظر هذا الحساب من قبل الإدارة. للاستفسار يرجى التواصل مع الدعم.</p>
        <button
          onClick={() => signOut()}
          className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-bold py-3 rounded-xl transition-colors"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [screen, setScreen] = useState('home');
  const [adminMode, setAdminMode] = useState(false);

  const openAdmin = useCallback(() => setAdminMode(true), []);
  const closeAdmin = useCallback(() => setAdminMode(false), []);

  if (loading) return <LoadingScreen />;
  if (!user) return <Suspense fallback={<LoadingScreen />}><AuthScreen /></Suspense>;
  if (profile?.banned) return <BannedScreen />;

  if (adminMode) {
    return (
      <PointsProvider>
        <div className="max-w-md mx-auto" dir="rtl">
          <Suspense fallback={<LoadingScreen />}><AdminPanel onExit={closeAdmin} /></Suspense>
        </div>
      </PointsProvider>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'home': return <Home onNavigate={setScreen} />;
      case 'wallet': return <WalletScreen />;
      case 'profile': return <Profile onAdminAccess={openAdmin} />;
      case 'tasks': return <DailyTasks />;
      case 'invite': return <InviteFriends />;
      default: return <Home onNavigate={setScreen} />;
    }
  };

  return (
    <PointsProvider>
      <div className="min-h-screen bg-black text-white max-w-md mx-auto relative" dir="rtl">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none max-w-md motion-reduce:hidden" />
        <main className="relative">
          <Suspense fallback={<LoadingScreen />}>{renderScreen()}</Suspense>
        </main>
        <BannerAd className="mx-4 mb-16" />
        <BottomNav active={screen} onNavigate={setScreen} />
      </div>
    </PointsProvider>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default memo(App);
