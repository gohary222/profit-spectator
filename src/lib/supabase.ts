import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Balance {
  user_id: string;
  points: number;
  total_earned: number;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  referral_code: string;
  banned: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  user_id: string;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  method: string;
  wallet_address: string;
  points: number;
  status: string;
  user_name: string;
  created_at: string;
}

export interface SpinHistory {
  id: string;
  user_id: string;
  prize: number;
  spun_at: string;
}

export const ADMIN_SECRET_CODE = '7392';
export const POINTS_PER_AD = 10;
export const AD_COOLDOWN_SECONDS = 30;
export const MIN_WITHDRAWAL_POINTS = 5000;
export const POINTS_TO_USD_RATE = 1000;
export const REFERRAL_REWARD = 50;

export const WITHDRAWAL_METHODS = [
  { id: 'vodafone_cash', label: 'Vodafone Cash', icon: '📱' },
  { id: 'paypal', label: 'PayPal', icon: '💳' },
  { id: 'binance_usdt', label: 'Binance USDT', icon: '🪙' },
] as const;

export const SPIN_PRIZES = [5, 10, 0, 20, 5, 50, 0, 15];
