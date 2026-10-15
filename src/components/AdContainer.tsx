import { memo, useState, useEffect, useCallback } from 'react';

const BANNER_AD_UNIT_ID = import.meta.env.VITE_ADMOB_BANNER_ID || 'ca-app-pub-3940256099942544/6300978111';
const INTERSTITIAL_AD_UNIT_ID = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || 'ca-app-pub-3940256099942544/1033173712';

interface BannerAdProps {
  className?: string;
}

function BannerAdBase({ className = '' }: BannerAdProps) {
  return (
    <div
      className={`ad-container banner-ad w-full flex items-center justify-center bg-zinc-900/80 border border-zinc-800/50 rounded-xl ${className}`}
      data-ad-unit-id={BANNER_AD_UNIT_ID}
      data-ad-format="banner"
      data-ad-type="admob"
    >
      <div className="py-2 px-4 text-center">
        <p className="text-zinc-600 text-[10px] font-bold tracking-wide">AD • إعلان</p>
        <p className="text-zinc-700 text-[9px] mt-0.5">Banner Ad Placeholder</p>
      </div>
    </div>
  );
}

export const BannerAd = memo(BannerAdBase);

interface InterstitialAdState {
  show: boolean;
  loading: boolean;
}

function useInterstitialAd() {
  const [state, setState] = useState<InterstitialAdState>({ show: false, loading: false });

  const showInterstitial = useCallback(() => {
    setState({ show: true, loading: true });
  }, []);

  const dismiss = useCallback(() => {
    setState({ show: false, loading: false });
  }, []);

  useEffect(() => {
    if (!state.show || !state.loading) return;
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, loading: false }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.show, state.loading]);

  return { ...state, showInterstitial, dismiss, adUnitId: INTERSTITIAL_AD_UNIT_ID };
}

interface InterstitialAdProps {
  show: boolean;
  loading: boolean;
  onClose: () => void;
  adUnitId: string;
}

function InterstitialAdBase({ show, loading, onClose, adUnitId }: InterstitialAdProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
      data-ad-unit-id={adUnitId}
      data-ad-format="interstitial"
      data-ad-type="admob"
    >
      <div className="flex items-center justify-between px-5 py-4 bg-zinc-900">
        <span className="text-amber-400 text-xs font-bold tracking-wide">إعلان • Ad</span>
        {!loading && (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors text-sm font-bold px-3 py-1 rounded-lg bg-zinc-800"
          >
            إغلاق ✕
          </button>
        )}
        {loading && (
          <span className="text-zinc-500 text-xs animate-pulse">جاري تحميل الإعلان...</span>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-zinc-900 to-black" />
        <div className="relative z-10 text-center px-8">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-black text-amber-400">AD</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Interstitial Ad</h2>
          <p className="text-zinc-400 text-sm">Placeholder — Replace with real AdMob ID</p>
        </div>
      </div>
    </div>
  );
}

export const InterstitialAd = memo(InterstitialAdBase);

export { useInterstitialAd };

export function getInterstitialAdUnitId() {
  return INTERSTITIAL_AD_UNIT_ID;
}

export function getBannerAdUnitId() {
  return BANNER_AD_UNIT_ID;
}

export default BannerAd;
