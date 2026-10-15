import { useState, useEffect, useRef, useCallback } from 'react';
import { Film, Target, Users, Wallet, Sparkles, TrendingUp, Gift, Timer, Dice5, CheckCircle2 } from 'lucide-react';
import { usePoints } from '@/context/PointsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { supabase, POINTS_PER_AD, POINTS_TO_USD_RATE, AD_COOLDOWN_SECONDS, SPIN_PRIZES } from '@/lib/supabase';
import AdSimulator from '@/components/AdSimulator';
import { InterstitialAd, useInterstitialAd } from '@/components/AdContainer';

interface HomeProps {
  onNavigate: (screen: string) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const { points, totalEarned, loading, addPoints, addPointsWithCooldown } = usePoints();
  const { profile, user } = useAuth();
  const { showToast } = useToast();
  const [adOpen, setAdOpen] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [todayAds, setTodayAds] = useState(0);
  const [spinOpen, setSpinOpen] = useState(false);
  const [spinDone, setSpinDone] = useState(false);
  const [interstitialCount, setInterstitialCount] = useState(0);
  const interstitial = useInterstitialAd();
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const COOLDOWN_KEY = `ad_cooldown_${user?.id ?? 'anon'}`;
  const ADS_KEY = `ads_today_${new Date().toDateString()}_${user?.id ?? 'anon'}`;

  useEffect(() => {
    const last = localStorage.getItem(COOLDOWN_KEY);
    if (last) {
      const remaining = Math.ceil((parseInt(last) + AD_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
      if (remaining > 0) setCooldown(remaining);
    }
    const ads = localStorage.getItem(ADS_KEY);
    if (ads) setTodayAds(parseInt(ads));
    setSpinDone(false);
  }, [COOLDOWN_KEY, ADS_KEY, user]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      }
      return;
    }
    cooldownTimer.current = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, [cooldown]);

  const startCooldown = useCallback(() => {
    localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
    setCooldown(AD_COOLDOWN_SECONDS);
    const newCount = todayAds + 1;
    setTodayAds(newCount);
    localStorage.setItem(ADS_KEY, newCount.toString());
  }, [ADS_KEY, COOLDOWN_KEY, todayAds]);

  const handleAdComplete = useCallback(async () => {
    setAdLoading(true);
    const result = await addPointsWithCooldown(POINTS_PER_AD, AD_COOLDOWN_SECONDS, 'مكافأة مشاهدة إعلان');
    setAdLoading(false);
    setAdOpen(false);
    if (result.success) {
      startCooldown();
      showToast('success', `+${POINTS_PER_AD} نقطة!`);
      const newCount = interstitialCount + 1;
      setInterstitialCount(newCount);
      if (newCount % 3 === 0) {
        interstitial.showInterstitial();
      }
    } else if (result.remaining && result.remaining > 0) {
      setCooldown(result.remaining);
      showToast('error', `انتظر ${result.remaining} ثانية قبل المشاهدة مرة أخرى`);
    } else {
      showToast('error', 'تعذر إضافة النقاط، حاول مرة أخرى');
    }
  }, [addPointsWithCooldown, showToast, startCooldown, interstitialCount, interstitial]);

  const checkSpinAvailability = useCallback(async () => {
    if (!user) return false;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('spin_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('spun_at', today)
      .maybeSingle();
    return !data;
  }, [user]);

  const handleSpin = useCallback(async () => {
    if (!user) return;
    const canSpin = await checkSpinAvailability();
    if (!canSpin) {
      showToast('error', 'لقد استخدمت عجلة الحظ اليوم');
      setSpinDone(true);
      return;
    }

    const prizeIndex = Math.floor(Math.random() * SPIN_PRIZES.length);
    const prize = SPIN_PRIZES[prizeIndex];
    const wheel = wheelRef.current;
    if (wheel) {
      const targetRotation = 360 * 5 + (360 / SPIN_PRIZES.length) * prizeIndex;
      wheel.style.setProperty('--spin-end', `${targetRotation}deg`);
      wheel.style.transform = `rotate(${targetRotation}deg)`;
      wheel.style.transition = 'transform 3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }

    spinTimer.current = setTimeout(async () => {
      if (prize > 0) {
        await addPoints(prize, 'spin', 'مكافأة عجلة الحظ');
        showToast('success', `+${prize} نقطة من عجلة الحظ!`);
      } else {
        showToast('info', 'حظ أوفر المرة القادمة!');
      }
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('spin_history').insert({ prize, spun_at: today });
      setSpinDone(true);
      spinTimer.current = null;
    }, 3100);
  }, [addPoints, checkSpinAvailability, showToast, user]);

  const usdValue = (points / POINTS_TO_USD_RATE).toFixed(2);
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'مستخدم';
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="pb-24 px-4 pt-6">
      {/* Header with user info */}
      <div className="flex items-center gap-3 mb-6 animate-slideUp">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} width="48" height="48" loading="lazy" decoding="async" className="w-12 h-12 rounded-full object-cover border-2 border-amber-400/50" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-black text-lg border-2 border-amber-400/50">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" />
        </div>
        <div className="flex-1">
          <p className="text-zinc-500 text-xs font-bold">مرحباً بعودتك</p>
          <h2 className="text-white font-black text-lg truncate" dir="auto">{displayName}</h2>
        </div>
        <div className="text-left">
          <Sparkles className="text-amber-400 mb-1" size={20} />
          <p className="text-amber-400 text-xs font-bold">عضو نشط</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative rounded-3xl overflow-hidden mb-6 shadow-2xl animate-slideUp">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-amber-500/15 blur-2xl motion-reduce:hidden" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl motion-reduce:hidden" />
        <div className="absolute inset-0 border border-amber-500/10 rounded-3xl" />

        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="text-amber-400" size={18} />
            <span className="text-zinc-400 text-sm font-bold">رصيدك الحالي</span>
          </div>

          {loading ? (
            <div className="h-16 w-48 rounded-2xl bg-zinc-800 animate-pulse mb-2" />
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black text-amber-400 tabular-nums text-glow-gold">
                  {points.toLocaleString('en-US')}
                </span>
                <span className="text-zinc-400 font-bold text-lg">نقطة</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp size={16} />
                <span className="font-bold text-lg tabular-nums text-glow-green">${usdValue}</span>
                <span className="text-zinc-500 text-sm">USD</span>
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
            <span className="text-zinc-500 text-xs">إجمالي الأرباح</span>
            <span className="text-zinc-300 font-bold text-sm tabular-nums">
              {totalEarned.toLocaleString('en-US')} نقطة
            </span>
          </div>
        </div>
      </div>

      {/* Watch Ad Button */}
      <button
        onClick={() => cooldown <= 0 && !adLoading && setAdOpen(true)}
        disabled={cooldown > 0 || adLoading}
        className="group relative w-full overflow-hidden rounded-2xl p-5 text-right transition-transform active:scale-[0.98] disabled:opacity-60 mb-3 animate-slideUp"
      >
        <div className={`absolute inset-0 bg-gradient-to-l from-amber-500 to-yellow-600 transition-colors ${cooldown <= 0 ? 'group-hover:from-amber-400 group-hover:to-yellow-500 neon-gold' : ''}`} />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Film className="text-white" size={26} />
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-lg">شاهد الإعلان واربح</p>
            <p className="text-white/80 text-sm font-bold">
              {cooldown > 0 ? (
                <span className="flex items-center gap-1">
                  <Timer size={14} />
                  انتظر {cooldown} ثانية
                </span>
              ) : (
                `+${POINTS_PER_AD} نقاط لكل مشاهدة`
              )}
            </p>
          </div>
          <div className="text-white text-3xl font-black drop-shadow-lg">
            +{POINTS_PER_AD}
          </div>
        </div>
      </button>

      {/* Spin Wheel Button */}
      <button
        onClick={() => setSpinOpen(true)}
        className="group relative w-full overflow-hidden rounded-2xl p-5 text-right transition-transform active:scale-[0.98] mb-3 animate-slideUp"
      >
        <div className="absolute inset-0 bg-gradient-to-l from-purple-600 to-fuchsia-700 group-hover:from-purple-500 group-hover:to-fuchsia-600 transition-colors" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Dice5 className="text-white" size={26} />
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-lg">عجلة الحظ اليومية</p>
            <p className="text-white/80 text-sm font-bold">لف واربح حتى 50 نقطة!</p>
          </div>
          <Gift className="text-white/60" size={28} />
        </div>
      </button>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-3 animate-slideUp">
        <button
          onClick={() => onNavigate('tasks')}
          className="group relative overflow-hidden rounded-2xl p-4 text-right transition-transform active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-600 to-green-700 group-hover:from-emerald-500 group-hover:to-green-600 transition-colors" />
          <div className="relative">
            <Target className="text-white mb-2" size={24} />
            <p className="text-white font-black text-sm">المهام اليومية</p>
            <p className="text-white/70 text-xs font-bold">أكمل واربح</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate('invite')}
          className="group relative overflow-hidden rounded-2xl p-4 text-right transition-transform active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-l from-sky-600 to-blue-700 group-hover:from-sky-500 group-hover:to-blue-600 transition-colors" />
          <div className="relative">
            <Users className="text-white mb-2" size={24} />
            <p className="text-white font-black text-sm">دعوة الأصدقاء</p>
            <p className="text-white/70 text-xs font-bold">+50 لكل صديق</p>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 animate-slideUp">
        <div className="glass rounded-2xl p-4 border border-zinc-800/50">
          <div className="flex items-center gap-2 mb-1">
            <Film className="text-amber-400" size={16} />
            <span className="text-zinc-500 text-xs font-bold">إعلانات اليوم</span>
          </div>
          <p className="text-white font-black text-xl tabular-nums">{todayAds}</p>
        </div>
        <button
          onClick={() => onNavigate('wallet')}
          className="glass rounded-2xl p-4 border border-zinc-800/50 text-right active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="text-emerald-400" size={16} />
            <span className="text-zinc-500 text-xs font-bold">المحفظة</span>
          </div>
          <p className="text-white font-black text-sm">اسحب أرباحك</p>
        </button>
      </div>

      <AdSimulator
        open={adOpen}
        onComplete={handleAdComplete}
        onClose={() => setAdOpen(false)}
      />

      <InterstitialAd
        show={interstitial.show}
        loading={interstitial.loading}
        onClose={interstitial.dismiss}
        adUnitId={interstitial.adUnitId}
      />

      {/* Spin Wheel Modal */}
      {spinOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 backdrop-blur-md px-6">
          <div className="glass rounded-3xl p-8 border border-zinc-700/50 max-w-sm w-full text-center animate-fadeIn">
            <h3 className="text-white font-black text-2xl mb-2 text-glow-gold">عجلة الحظ</h3>
            <p className="text-zinc-400 text-sm mb-6">{spinDone ? 'تعال غداً للمحاولة مرة أخرى!' : 'اضغط لبدء الدوران'}</p>

            {/* Wheel */}
            <div className="relative w-56 h-56 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-amber-400/30 shadow-2xl" />
              <div
                ref={wheelRef}
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{ transform: 'rotate(0deg)' }}
              >
                {SPIN_PRIZES.map((prize, i) => {
                  const angle = (360 / SPIN_PRIZES.length) * i;
                  const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];
                  return (
                    <div
                      key={i}
                      className="absolute top-0 left-1/2 origin-bottom"
                      style={{
                        transform: `translateX(-50%) rotate(${angle}deg)`,
                        height: '50%',
                        width: '2px',
                      }}
                    >
                      <div
                        className="absolute top-2 left-1/2 -translate-x-1/2 text-white font-black text-sm whitespace-nowrap"
                        style={{ color: colors[i] }}
                      >
                        {prize > 0 ? `+${prize}` : '0'}
                      </div>
                    </div>
                  );
                })}
                {SPIN_PRIZES.map((_, i) => {
                  const angle = (360 / SPIN_PRIZES.length) * i;
                  const nextAngle = (360 / SPIN_PRIZES.length) * (i + 1);
                  const colors = ['#f59e0b33', '#10b98133', '#6366f133', '#ec489933', '#f59e0b33', '#10b98133', '#6366f133', '#ec489933'];
                  return (
                    <div
                      key={`seg-${i}`}
                      className="absolute top-1/2 left-1/2"
                      style={{
                        width: '50%',
                        height: '50%',
                        background: colors[i],
                        clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                        transformOrigin: '0 0',
                        transform: `rotate(${angle + (nextAngle - angle) / 2 - 90}deg)`,
                      }}
                    />
                  );
                })}
              </div>
              {/* Pointer */}
              <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-amber-400 z-10" />
              {/* Center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-amber-500 border-4 border-black z-10 flex items-center justify-center">
                <Dice5 className="text-white" size={20} />
              </div>
            </div>

            {!spinDone ? (
              <button
                onClick={handleSpin}
                className="w-full bg-gradient-to-l from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-black py-3.5 rounded-xl transition-transform active:scale-95 neon-gold"
              >
                ابدأ الدوران
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 size={20} />
                تم استخدام محاولتك اليوم
              </div>
            )}

            <button
              onClick={() => setSpinOpen(false)}
              className="w-full mt-3 text-zinc-500 hover:text-zinc-300 text-sm font-bold transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
