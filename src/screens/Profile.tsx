import { useState, useEffect, useRef } from 'react';
import { User, History, TrendingUp, Award, Film, Target, Users, ArrowDownToLine, LogOut, Dice5 } from 'lucide-react';
import { usePoints } from '@/context/PointsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, POINTS_TO_USD_RATE, type Transaction } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

interface ProfileProps {
  onAdminAccess: () => void;
}

export default function Profile({ onAdminAccess }: ProfileProps) {
  const { points, totalEarned, loading } = usePoints();
  const { user, profile, signOut } = useAuth();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAvatarTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1500);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      onAdminAccess();
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
    setTxLoading(false);
  };

  const usdValue = (points / POINTS_TO_USD_RATE).toFixed(2);
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'مستخدم';
  const avatarUrl = profile?.avatar_url;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'ad': return <Film size={18} className="text-amber-400" />;
      case 'daily_task': return <Target size={18} className="text-emerald-400" />;
      case 'referral': return <Users size={18} className="text-sky-400" />;
      case 'withdrawal': return <ArrowDownToLine size={18} className="text-red-400" />;
      case 'spin': return <Dice5 size={18} className="text-fuchsia-400" />;
      default: return <Award size={18} className="text-zinc-400" />;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'ad': return 'مكافأة إعلان';
      case 'daily_task': return 'مكافأة مهمة يومية';
      case 'referral': return 'مكافأة دعوة صديق';
      case 'withdrawal': return 'سحب نقاط';
      case 'spin': return 'مكافأة عجلة الحظ';
      default: return 'معاملة';
    }
  };

  const stats = [
    { label: 'الرصيد الحالي', value: `${points.toLocaleString('en-US')}`, sub: 'نقطة', color: 'text-amber-400' },
    { label: 'القيمة بالدولار', value: `$${usdValue}`, sub: 'USD', color: 'text-emerald-400' },
    { label: 'إجمالي الأرباح', value: `${totalEarned.toLocaleString('en-US')}`, sub: 'نقطة', color: 'text-sky-400' },
  ];

  return (
    <div className="pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6 animate-slideUp">
        <User className="text-amber-400" size={28} />
        <h1 className="text-2xl font-black text-white">الحساب الشخصي</h1>
      </div>

      {/* Profile Avatar */}
      <div className="flex flex-col items-center mb-6 animate-slideUp">
        <div className="relative" onClick={handleAvatarTap}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} width="96" height="96" loading="lazy" decoding="async" className="w-24 h-24 rounded-full object-cover border-2 border-amber-400/50 shadow-2xl" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-4xl font-black text-white shadow-2xl border-2 border-amber-400/50">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-emerald-500 border-4 border-black flex items-center justify-center">
            <Award size={14} className="text-white" />
          </div>
        </div>
        <p className="text-white font-black text-lg mt-3" dir="auto">{displayName}</p>
        <p className="text-zinc-500 text-sm" dir="ltr">{user?.email}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-slideUp">
        {stats.map((stat, i) => (
          <div key={i} className="glass rounded-2xl p-4 border border-zinc-800/50 text-center">
            {loading ? (
              <div className="h-8 w-16 mx-auto rounded bg-zinc-800 animate-pulse mb-2" />
            ) : (
              <p className={`font-black text-lg tabular-nums ${stat.color}`}>{stat.value}</p>
            )}
            <p className="text-zinc-500 text-xs mt-1">{stat.sub}</p>
            <p className="text-zinc-600 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div className="animate-slideUp">
        <div className="flex items-center gap-2 mb-3">
          <History className="text-zinc-400" size={20} />
          <h2 className="text-white font-black text-lg">سجل النشاط</h2>
        </div>

        {txLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="glass rounded-2xl p-8 border border-zinc-800/50 text-center">
            <TrendingUp className="text-zinc-700 mx-auto mb-2" size={32} />
            <p className="text-zinc-600 text-sm">لا يوجد نشاط بعد</p>
            <p className="text-zinc-700 text-xs mt-1">ابدأ بمشاهدة الإعلانات لربح النقاط</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="glass rounded-2xl p-4 border border-zinc-800/50 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center flex-shrink-0">
                  {typeIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{typeLabel(tx.type)}</p>
                  <p className="text-zinc-600 text-xs">
                    {new Date(tx.created_at).toLocaleString('ar-EG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className={`font-black text-sm tabular-nums flex-shrink-0 ${
                  tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-US')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button
        onClick={async () => {
          await signOut();
          showToast('info', 'تم تسجيل الخروج');
        }}
        className="w-full glass hover:bg-red-900/20 border border-zinc-800/50 hover:border-red-800/50 text-zinc-400 hover:text-red-400 font-bold py-3.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-6 animate-slideUp"
      >
        <LogOut size={20} />
        تسجيل الخروج
      </button>
    </div>
  );
}
