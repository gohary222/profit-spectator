import { useState, useEffect, useCallback, useMemo, createContext, useContext, type ReactNode } from 'react';
import { supabase, type Balance } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

interface PointsContextValue {
  points: number;
  totalEarned: number;
  loading: boolean;
  addPoints: (amount: number, type: string, description: string) => Promise<boolean>;
  addPointsWithCooldown: (amount: number, cooldownSeconds: number, description: string) => Promise<{ success: boolean; remaining?: number }>;
  deductPoints: (amount: number, type: string, description: string) => Promise<boolean>;
  requestWithdrawal: (method: string, walletAddress: string, pointsAmount: number, userName: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const PointsContext = createContext<PointsContextValue | null>(null);

export function PointsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    if (!user) {
      setPoints(0);
      setTotalEarned(0);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('balances')
      .select('points, total_earned')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      setLoading(false);
      return;
    }

    if (data) {
      setPoints((data as Balance).points);
      setTotalEarned((data as Balance).total_earned);
    } else {
      setPoints(0);
      setTotalEarned(0);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      refresh();
    } else {
      setPoints(0);
      setTotalEarned(0);
      setLoading(false);
    }
  }, [user, refresh]);

  // Generic add points via server-side atomic function
  const addPoints = useCallback(
    async (amount: number, type: string, description: string): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('add_points_generic', {
        p_amount: amount,
        p_type: type,
        p_description: description,
      });

      if (error) {
        console.error('[addPoints] RPC error:', error);
        showToast('error', 'تعذر إضافة النقاط، حاول مرة أخرى');
        return false;
      }
      if (!data) {
        showToast('error', 'تعذر إضافة النقاط، حاول مرة أخرى');
        return false;
      }

      const result = data as { success: boolean; points?: number; total_earned?: number; error?: string };

      if (!result.success) {
        if (result.error === 'banned') {
          showToast('error', 'تم حظر حسابك');
        } else {
          showToast('error', 'تعذر إضافة النقاط');
        }
        return false;
      }

      if (result.points !== undefined) setPoints(result.points);
      if (result.total_earned !== undefined) setTotalEarned(result.total_earned);
      return true;
    },
    [user, showToast]
  );

  // Add points with server-side cooldown enforcement (for ads)
  const addPointsWithCooldown = useCallback(
    async (amount: number, cooldownSeconds: number, description: string): Promise<{ success: boolean; remaining?: number }> => {
      if (!user) return { success: false };

      const { data, error } = await supabase.rpc('add_points_with_cooldown', {
        p_amount: amount,
        p_cooldown_seconds: cooldownSeconds,
        p_description: description,
      });

      if (error) {
        console.error('[addPointsWithCooldown] RPC error:', error);
        return { success: false };
      }
      if (!data) {
        return { success: false };
      }

      const result = data as { success: boolean; points?: number; total_earned?: number; error?: string; remaining?: number };

      if (!result.success) {
        if (result.error === 'banned') {
          showToast('error', 'تم حظر حسابك');
        }
        return { success: false, remaining: result.remaining };
      }

      if (result.points !== undefined) setPoints(result.points);
      if (result.total_earned !== undefined) setTotalEarned(result.total_earned);
      return { success: true };
    },
    [user, showToast]
  );

  // Legacy deductPoints (kept for compatibility, but withdrawal now uses requestWithdrawal)
  const deductPoints = useCallback(
    async (amount: number, type: string, description: string): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('add_points_generic', {
        p_amount: -amount,
        p_type: type,
        p_description: description,
      });

      if (error) {
        console.error('[deductPoints] RPC error:', error);
        showToast('error', 'حدث خطأ، حاول مرة أخرى');
        return false;
      }
      if (!data) {
        showToast('error', 'حدث خطأ، حاول مرة أخرى');
        return false;
      }

      const result = data as { success: boolean; points?: number; error?: string };

      if (!result.success) {
        if (result.error === 'invalid_amount') {
          showToast('error', 'مبلغ غير صحيح');
        } else {
          showToast('error', 'نقاطك غير كافية');
        }
        return false;
      }

      if (result.points !== undefined) setPoints(result.points);
      return true;
    },
    [user, showToast]
  );

  // Atomic withdrawal: server checks balance >= amount, deducts, creates record
  const requestWithdrawal = useCallback(
    async (method: string, walletAddress: string, pointsAmount: number, userName: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data, error } = await supabase.rpc('request_withdrawal', {
        p_method: method,
        p_wallet_address: walletAddress,
        p_points: pointsAmount,
        p_user_name: userName,
      });

      if (error) {
        console.error('[requestWithdrawal] RPC error:', error);
        return { success: false, error: 'حدث خطأ، حاول مرة أخرى' };
      }
      if (!data) {
        return { success: false, error: 'حدث خطأ، حاول مرة أخرى' };
      }

      const result = data as { success: boolean; points?: number; error?: string };

      if (!result.success) {
        if (result.error === 'banned') {
          return { success: false, error: 'تم حظر حسابك' };
        } else if (result.error === 'insufficient_points') {
          return { success: false, error: `رصيدك غير كافٍ — لديك ${result.points ?? 0} نقطة` };
        } else if (result.error === 'insufficient_minimum') {
          return { success: false, error: 'الحد الأدنى للسحب 5000 نقطة' };
        } else if (result.error === 'invalid_wallet') {
          return { success: false, error: 'اكتب رقم محفظتك بشكل صحيح' };
        }
        return { success: false, error: 'تعذر إتمام طلب السحب' };
      }

      if (result.points !== undefined) setPoints(result.points);
      return { success: true };
    },
    [user]
  );

  const value = useMemo(
    () => ({ points, totalEarned, loading, addPoints, addPointsWithCooldown, deductPoints, requestWithdrawal, refresh }),
    [points, totalEarned, loading, addPoints, addPointsWithCooldown, deductPoints, requestWithdrawal, refresh]
  );

  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) throw new Error('usePoints must be used within PointsProvider');
  return ctx;
}
