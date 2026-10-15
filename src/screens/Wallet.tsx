import { useState, useEffect } from 'react';
import { Wallet, ArrowDownToLine, CheckCircle2, Clock, XCircle, Info } from 'lucide-react';
import { usePoints } from '@/context/PointsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { supabase, MIN_WITHDRAWAL_POINTS, POINTS_TO_USD_RATE, WITHDRAWAL_METHODS, type Withdrawal } from '@/lib/supabase';

export default function WalletScreen() {
  const { points, loading, requestWithdrawal, refresh } = usePoints();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [method, setMethod] = useState<string>('vodafone_cash');
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(false);

  const usdValue = (points / POINTS_TO_USD_RATE).toFixed(2);
  const canWithdraw = points >= MIN_WITHDRAWAL_POINTS && walletAddress.trim().length > 0;

  useEffect(() => {
    loadWithdrawals();
  }, [user]);

  const loadWithdrawals = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setWithdrawals(data as Withdrawal[]);
    }
    setHistoryLoading(false);
  };

  const handleWithdraw = async () => {
    if (points < MIN_WITHDRAWAL_POINTS) {
      showToast('error', `الحد الأدنى للسحب ${MIN_WITHDRAWAL_POINTS} نقطة`);
      return;
    }
    if (walletAddress.trim().length < 3) {
      showToast('error', 'اكتب رقم محفظتك بشكل صحيح');
      return;
    }

    setSubmitting(true);
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'مستخدم';
    const result = await requestWithdrawal(method, walletAddress.trim(), MIN_WITHDRAWAL_POINTS, displayName);

    if (result.success) {
      showToast('success', 'تم استلام طلب السحب بنجاح!');
      setWalletAddress('');
      setConfirmModal(true);
      await loadWithdrawals();
      await refresh();
    } else {
      showToast('error', result.error || 'تعذر إتمام طلب السحب');
    }
    setSubmitting(false);
  };

  const statusLabel = (status: string) => {
    if (status === 'pending') return 'قيد المراجعة';
    if (status === 'completed') return 'تم التحويل بنجاح';
    return 'مرفوض';
  };

  const statusColor = (status: string) => {
    if (status === 'pending') return 'text-amber-400 bg-amber-400/10';
    if (status === 'completed') return 'text-emerald-400 bg-emerald-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const statusIcon = (status: string) => {
    if (status === 'pending') return <Clock size={14} />;
    if (status === 'completed') return <CheckCircle2 size={14} />;
    return <XCircle size={14} />;
  };

  const methodLabel = (m: string) => {
    const found = WITHDRAWAL_METHODS.find((wm) => wm.id === m);
    return found ? `${found.icon} ${found.label}` : m;
  };

  const placeholderMap: Record<string, string> = {
    vodafone_cash: '01xxxxxxxxx',
    paypal: 'example@email.com',
    binance_usdt: 'USDT Wallet Address',
  };

  return (
    <div className="pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6 animate-slideUp">
        <Wallet className="text-emerald-400" size={28} />
        <h1 className="text-2xl font-black text-white">المحفظة والسحب</h1>
      </div>

      {/* Balance Card */}
      <div className="relative rounded-3xl overflow-hidden mb-6 shadow-2xl animate-slideUp">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-zinc-900 to-black" />
        <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-emerald-500/20 blur-[60px]" />
        <div className="absolute inset-0 border border-emerald-500/10 rounded-3xl" />
        <div className="relative p-6">
          <p className="text-zinc-400 text-sm font-bold mb-2">رصيدك المتاح</p>
          {loading ? (
            <div className="h-14 w-40 rounded-2xl bg-zinc-800 animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-black text-emerald-400 tabular-nums text-glow-green">
                {points.toLocaleString('en-US')}
              </span>
              <span className="text-zinc-400 font-bold">نقطة = ${usdValue}</span>
            </div>
          )}
          <div className="pt-4 border-t border-zinc-800/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">الحد الأدنى للسحب</span>
              <span className="text-amber-400 font-black">
                {MIN_WITHDRAWAL_POINTS.toLocaleString('en-US')} نقطة = ${(MIN_WITHDRAWAL_POINTS / POINTS_TO_USD_RATE).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="glass rounded-2xl p-5 border border-zinc-800/50 mb-6 animate-slideUp">
        <h2 className="text-white font-black text-lg mb-4 flex items-center gap-2">
          <ArrowDownToLine className="text-emerald-400" size={20} />
          طلب سحب جديد
        </h2>

        {/* Method Selection */}
        <p className="text-zinc-500 text-sm font-bold mb-2">طريقة السحب</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {WITHDRAWAL_METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`rounded-xl p-3 border-2 transition-all text-center active:scale-95 ${
                method === m.id
                  ? 'border-emerald-500 bg-emerald-500/10 neon-green'
                  : 'border-zinc-800 bg-black/30'
              }`}
            >
              <div className="text-xl mb-1">{m.icon}</div>
              <p className={`font-bold text-[10px] leading-tight ${method === m.id ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {m.label}
              </p>
            </button>
          ))}
        </div>

        {/* Wallet Address Input */}
        <p className="text-zinc-500 text-sm font-bold mb-2">
          {method === 'vodafone_cash' ? 'رقم هاتف Vodafone Cash' : method === 'paypal' ? 'بريد PayPal الإلكتروني' : 'عنوان محفظة USDT'}
        </p>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder={placeholderMap[method] || ''}
          dir="ltr"
          className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white text-right placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors mb-4"
        />

        {/* Withdraw Info */}
        <div className="bg-black/30 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-zinc-400 text-sm">سيتم سحب</span>
          <span className="text-white font-black">
            {MIN_WITHDRAWAL_POINTS.toLocaleString('en-US')} نقطة = ${(MIN_WITHDRAWAL_POINTS / POINTS_TO_USD_RATE).toFixed(2)}
          </span>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!canWithdraw || submitting || loading}
          className="w-full bg-gradient-to-l from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed neon-green"
        >
          {submitting ? 'جاري الإرسال...' : 'طلب السحب'}
        </button>

        {points < MIN_WITHDRAWAL_POINTS && (
          <p className="text-amber-400/70 text-xs text-center mt-3">
            تحتاج {(MIN_WITHDRAWAL_POINTS - points).toLocaleString('en-US')} نقطة إضافية للوصول للحد الأدنى
          </p>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="animate-slideUp">
        <h2 className="text-white font-black text-lg mb-3 flex items-center gap-2">
          <Clock className="text-zinc-400" size={20} />
          سجل طلبات السحب
        </h2>
        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="glass rounded-2xl p-8 border border-zinc-800/50 text-center">
            <p className="text-zinc-600 text-sm">لا توجد طلبات سحب بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="glass rounded-2xl p-4 border border-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-bold text-sm">{methodLabel(w.method)}</p>
                  <p className="text-amber-400 font-black text-sm tabular-nums">
                    {w.points.toLocaleString('en-US')} نقطة
                  </p>
                </div>
                <p className="text-zinc-500 text-xs" dir="ltr">{w.wallet_address}</p>
                <p className="text-zinc-600 text-xs mt-1">
                  {new Date(w.created_at).toLocaleDateString('ar-EG')}
                </p>
                <div className="mt-2">
                  <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${statusColor(w.status)}`}>
                    {statusIcon(w.status)}
                    {statusLabel(w.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6">
          <div className="glass rounded-3xl p-8 border border-emerald-800/50 shadow-2xl max-w-sm w-full text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 neon-green">
              <CheckCircle2 className="text-emerald-400" size={44} />
            </div>
            <h3 className="text-white font-black text-xl mb-3">تم استلام طلب السحب!</h3>
            <div className="bg-black/30 rounded-xl p-4 mb-4 flex items-start gap-2 text-right">
              <Info className="text-sky-400 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-zinc-300 text-sm leading-relaxed">
                تم استلام طلبك بنجاح وسيتم مراجعة الطلب وتحويل المبلغ خلال 3 إلى 7 أيام عمل.
              </p>
            </div>
            <p className="text-zinc-500 text-xs mb-5">سيتم خصم النقاط من رصيدك فوراً حتى يتم التحويل.</p>
            <button
              onClick={() => setConfirmModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-colors active:scale-95"
            >
              حسناً
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
