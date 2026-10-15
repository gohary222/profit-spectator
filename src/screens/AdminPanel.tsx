import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Lock, CheckCircle2, XCircle, Clock, ArrowRight,
  DollarSign, TrendingUp, Users, LogOut, Eye, EyeOff, Ban, UserCheck,
} from 'lucide-react';
import {
  supabase, ADMIN_SECRET_CODE, POINTS_TO_USD_RATE,
  type Withdrawal,
} from '@/lib/supabase';
import { useToast } from '@/components/Toast';

interface AdminPanelProps {
  onExit: () => void;
}

interface AdminUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  referral_code: string;
  banned: boolean;
  created_at: string;
}

export default function AdminPanel({ onExit }: AdminPanelProps) {
  const { showToast } = useToast();
  const [authed, setAuthed] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [tab, setTab] = useState<'withdrawals' | 'users'>('withdrawals');

  const loadWithdrawals = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_all_withdrawals', {
      admin_code: ADMIN_SECRET_CODE,
    });
    if (!error && data) {
      setWithdrawals(data as Withdrawal[]);
    }
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_all_users', {
      admin_code: ADMIN_SECRET_CODE,
    });
    if (!error && data) {
      setUsers(data as AdminUser[]);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      loadWithdrawals();
      loadUsers();
    }
  }, [authed, loadWithdrawals, loadUsers]);

  const handleLogin = () => {
    if (codeInput.trim() === ADMIN_SECRET_CODE) {
      setAuthed(true);
      showToast('success', 'مرحباً بك في لوحة التحكم');
    } else {
      showToast('error', 'الرقم السري غير صحيح');
    }
  };

  const updateStatus = async (id: string, status: 'completed' | 'rejected') => {
    setActionLoading(id);
    const { error } = await supabase.rpc('admin_update_withdrawal_status', {
      wid: id,
      new_status: status,
      admin_code: ADMIN_SECRET_CODE,
    });

    if (error) {
      showToast('error', 'حدث خطأ، حاول مرة أخرى');
    } else {
      showToast('success', status === 'completed' ? 'تم تحديث الحالة: تم التحويل' : 'تم رفض الطلب');
      await loadWithdrawals();
    }
    setActionLoading(null);
  };

  const toggleBan = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase.rpc('admin_toggle_ban', {
      target_user_id: userId,
      admin_code: ADMIN_SECRET_CODE,
    });

    if (error) {
      showToast('error', 'حدث خطأ، حاول مرة أخرى');
    } else {
      showToast('success', 'تم تحديث حالة المستخدم');
      await loadUsers();
    }
    setActionLoading(null);
  };

  const filtered = withdrawals.filter((w) => filter === 'all' || w.status === filter);

  const stats = {
    total: withdrawals.length,
    pending: withdrawals.filter((w) => w.status === 'pending').length,
    completed: withdrawals.filter((w) => w.status === 'completed').length,
    rejected: withdrawals.filter((w) => w.status === 'rejected').length,
    totalAmount: withdrawals
      .filter((w) => w.status === 'pending')
      .reduce((sum, w) => sum + w.points, 0),
  };

  const statusBadge = (status: string) => {
    if (status === 'pending')
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 text-amber-400 px-2.5 py-0.5 text-xs font-bold">
          <Clock size={12} /> قيد المراجعة
        </span>
      );
    if (status === 'completed')
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 text-emerald-400 px-2.5 py-0.5 text-xs font-bold">
          <CheckCircle2 size={12} /> تم التحويل
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-400/10 text-red-400 px-2.5 py-0.5 text-xs font-bold">
        <XCircle size={12} /> مرفوض
      </span>
    );
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6" dir="rtl">
        <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8 animate-slideUp">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center mx-auto mb-4 shadow-2xl neon-gold">
              <Shield className="text-white" size={40} />
            </div>
            <h1 className="text-2xl font-black text-white">لوحة تحكم الأدمن</h1>
            <p className="text-zinc-500 text-sm mt-1">Profit Spectator Admin</p>
          </div>

          <div className="glass rounded-2xl p-6 border border-zinc-800/50 animate-slideUp">
            <label className="text-zinc-400 text-sm font-bold mb-2 block">الرقم السري</label>
            <div className="relative mb-4">
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type={showCode ? 'text' : 'password'}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••"
                dir="ltr"
                className="w-full bg-black/40 border border-zinc-800 rounded-xl pr-10 pl-10 py-3 text-white text-center tracking-widest focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              <button
                onClick={() => setShowCode(!showCode)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-l from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-black py-3 rounded-xl transition-all active:scale-95 neon-gold"
            >
              دخول
            </button>

            <button
              onClick={onExit}
              className="w-full mt-3 text-zinc-500 hover:text-zinc-300 text-sm font-bold transition-colors flex items-center justify-center gap-1"
            >
              <ArrowRight size={16} />
              العودة للتطبيق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-6 pb-10" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-slideUp">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center neon-gold">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black">لوحة التحكم</h1>
            <p className="text-zinc-500 text-xs">إدارة طلبات السحب والمستخدمين</p>
          </div>
        </div>
        <button
          onClick={onExit}
          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
        >
          <LogOut size={18} />
          خروج
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-zinc-900 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('withdrawals')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'withdrawals' ? 'bg-amber-500 text-white' : 'text-zinc-400'
          }`}
        >
          <DollarSign size={16} />
          طلبات السحب
        </button>
        <button
          onClick={() => setTab('users')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'users' ? 'bg-amber-500 text-white' : 'text-zinc-400'
          }`}
        >
          <Users size={16} />
          المستخدمون
        </button>
      </div>

      {tab === 'withdrawals' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-6 animate-slideUp">
            <div className="glass rounded-xl p-3 border border-zinc-800/50 text-center">
              <Users className="text-sky-400 mx-auto mb-1" size={18} />
              <p className="text-white font-black text-lg tabular-nums">{stats.total}</p>
              <p className="text-zinc-600 text-xs">الكل</p>
            </div>
            <div className="glass rounded-xl p-3 border border-zinc-800/50 text-center">
              <Clock className="text-amber-400 mx-auto mb-1" size={18} />
              <p className="text-white font-black text-lg tabular-nums">{stats.pending}</p>
              <p className="text-zinc-600 text-xs">قيد المراجعة</p>
            </div>
            <div className="glass rounded-xl p-3 border border-zinc-800/50 text-center">
              <CheckCircle2 className="text-emerald-400 mx-auto mb-1" size={18} />
              <p className="text-white font-black text-lg tabular-nums">{stats.completed}</p>
              <p className="text-zinc-600 text-xs">مكتمل</p>
            </div>
            <div className="glass rounded-xl p-3 border border-zinc-800/50 text-center">
              <DollarSign className="text-amber-400 mx-auto mb-1" size={18} />
              <p className="text-white font-black text-lg tabular-nums">
                ${(stats.totalAmount / POINTS_TO_USD_RATE).toFixed(2)}
              </p>
              <p className="text-zinc-600 text-xs">بانتظار</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'pending', label: 'قيد المراجعة' },
              { id: 'completed', label: 'تم التحويل' },
              { id: 'rejected', label: 'مرفوض' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as typeof filter)}
                className={`rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
                  filter === t.id
                    ? 'bg-amber-500 text-white'
                    : 'glass text-zinc-400 border border-zinc-800/50 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Withdrawal Requests */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-zinc-900 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl p-10 border border-zinc-800/50 text-center">
              <TrendingUp className="text-zinc-700 mx-auto mb-3" size={36} />
              <p className="text-zinc-600 text-sm">لا توجد طلبات في هذا التصنيف</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((w) => (
                <div
                  key={w.id}
                  className="glass rounded-2xl p-4 border border-zinc-800/50 animate-slideUp"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-black/40 flex items-center justify-center">
                        <Users size={16} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{w.user_name}</p>
                        <p className="text-zinc-600 text-xs">
                          {w.method === 'vodafone_cash' ? 'Vodafone Cash' : w.method === 'paypal' ? 'PayPal' : 'Binance USDT'}
                        </p>
                      </div>
                    </div>
                    {statusBadge(w.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-black/30 rounded-lg p-2.5">
                      <p className="text-zinc-600 text-xs mb-0.5">رقم المحفظة</p>
                      <p className="text-zinc-300 text-sm font-bold truncate" dir="ltr">
                        {w.wallet_address}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-2.5">
                      <p className="text-zinc-600 text-xs mb-0.5">المبلغ</p>
                      <p className="text-amber-400 text-sm font-black tabular-nums">
                        {w.points.toLocaleString('en-US')} نقطة = ${(w.points / POINTS_TO_USD_RATE).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <p className="text-zinc-600 text-xs mb-3">
                    {new Date(w.created_at).toLocaleString('ar-EG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>

                  {w.status === 'pending' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateStatus(w.id, 'completed')}
                        disabled={actionLoading === w.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2.5 rounded-xl transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={16} />
                        موافقة وتم التحويل
                      </button>
                      <button
                        onClick={() => updateStatus(w.id, 'rejected')}
                        disabled={actionLoading === w.id}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold text-sm py-2.5 rounded-xl transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <XCircle size={16} />
                        رفض
                      </button>
                    </div>
                  ) : (
                    <div className="bg-black/20 rounded-xl p-2.5 text-center">
                      <p className="text-zinc-600 text-xs">تم اتخاذ إجراء على هذا الطلب</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'users' && (
        <div className="space-y-3 animate-slideUp">
          {users.length === 0 ? (
            <div className="glass rounded-2xl p-10 border border-zinc-800/50 text-center">
              <Users className="text-zinc-700 mx-auto mb-3" size={36} />
              <p className="text-zinc-600 text-sm">لا يوجد مستخدمون</p>
            </div>
          ) : (
            users.map((u) => (
              <div key={u.user_id} className="glass rounded-2xl p-4 border border-zinc-800/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-black flex-shrink-0">
                  {u.display_name?.charAt(0).toUpperCase() || '؟'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm" dir="auto">{u.display_name || 'بدون اسم'}</p>
                  <p className="text-zinc-600 text-xs" dir="ltr">{u.referral_code}</p>
                </div>
                {u.banned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-400/10 text-red-400 px-2.5 py-0.5 text-xs font-bold flex-shrink-0">
                    <Ban size={12} /> محظور
                  </span>
                )}
                <button
                  onClick={() => toggleBan(u.user_id)}
                  disabled={actionLoading === u.user_id}
                  className={`flex-shrink-0 rounded-xl px-3 py-2 font-bold text-xs transition-colors active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ${
                    u.banned
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-600/80 hover:bg-red-500 text-white'
                  }`}
                >
                  {u.banned ? <UserCheck size={14} /> : <Ban size={14} />}
                  {u.banned ? 'رفع الحظر' : 'حظر'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
