import { useState } from 'react';
import { Users, Copy, Check, Share2, Gift, UserPlus } from 'lucide-react';
import { usePoints } from '@/context/PointsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { REFERRAL_REWARD } from '@/lib/supabase';

export default function InviteFriends() {
  const { addPoints } = usePoints();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const referralCode = profile?.referral_code || 'PS-XXXXXX';
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(referralLink).then(() => {
      setCopied(true);
      showToast('info', 'تم نسخ الرابط');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showToast('error', 'تعذر النسخ');
    });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Profit Spectator — المُشاهد الرابح',
          text: 'انضم إلي واربح النقاط مجاناً!',
          url: referralLink,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  };

  const simulateReferral = async () => {
    setClaiming(true);
    const success = await addPoints(REFERRAL_REWARD, 'referral', 'مكافأة دعوة صديق');
    if (success) {
      showToast('success', `انضم صديقك! +${REFERRAL_REWARD} نقطة`);
    }
    setClaiming(false);
  };

  return (
    <div className="pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6 animate-slideUp">
        <Users className="text-sky-400" size={28} />
        <h1 className="text-2xl font-black text-white">دعوة الأصدقاء</h1>
      </div>

      {/* Hero Card */}
      <div className="relative rounded-3xl overflow-hidden mb-6 shadow-2xl animate-slideUp">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/40 via-zinc-900 to-black" />
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-sky-500/15 blur-[60px]" />
        <div className="absolute inset-0 border border-sky-500/10 rounded-3xl" />
        <div className="relative p-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <UserPlus className="text-white" size={36} />
          </div>
          <h2 className="text-white font-black text-xl mb-2">اربح {REFERRAL_REWARD} نقطة لكل صديق!</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            شارك رمز الدعوة مع أصدقائك. عند انضمام أي صديق عبر رابطك تحصل على {REFERRAL_REWARD} نقطة فوراً.
          </p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="glass rounded-2xl p-5 border border-zinc-800/50 mb-4 animate-slideUp">
        <p className="text-zinc-500 text-sm font-bold mb-2">رمز الدعوة الخاص بك</p>
        <div className="flex items-center justify-between bg-black/40 rounded-xl px-4 py-3">
          <span className="text-amber-400 font-black text-lg tracking-wider" dir="ltr">
            {referralCode}
          </span>
          <button
            onClick={copyLink}
            className="text-sky-400 hover:text-sky-300 transition-colors"
          >
            {copied ? <Check size={22} /> : <Copy size={22} />}
          </button>
        </div>
      </div>

      {/* Referral Link */}
      <div className="glass rounded-2xl p-5 border border-zinc-800/50 mb-6 animate-slideUp">
        <p className="text-zinc-500 text-sm font-bold mb-2">رابط الدعوة</p>
        <div className="bg-black/40 rounded-xl px-4 py-3 mb-3">
          <p className="text-zinc-300 text-sm truncate" dir="ltr">
            {referralLink}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={copyLink}
            className="bg-black/40 hover:bg-zinc-800 text-white font-bold text-sm py-3 rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'تم النسخ' : 'نسخ'}
          </button>
          <button
            onClick={shareLink}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm py-3 rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            مشاركة
          </button>
        </div>
      </div>

      {/* Simulate Referral Reward */}
      <div className="glass rounded-2xl p-5 border border-sky-800/30 mb-6 animate-slideUp">
        <div className="flex items-center gap-3 mb-3">
          <Gift className="text-sky-400" size={24} />
          <div>
            <p className="text-white font-bold text-sm">محاكاة مكافأة دعوة</p>
            <p className="text-zinc-500 text-xs">اضغط لمحاكاة انضمام صديق وربح {REFERRAL_REWARD} نقطة</p>
          </div>
        </div>
        <button
          onClick={simulateReferral}
          disabled={claiming}
          className="w-full bg-gradient-to-l from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <UserPlus size={20} />
          {claiming ? 'جاري المعالجة...' : `محاكاة انضمام صديق (+${REFERRAL_REWARD})`}
        </button>
      </div>

      {/* How it works */}
      <div className="animate-slideUp">
        <h2 className="text-white font-black text-lg mb-3">كيف يعمل؟</h2>
        <div className="space-y-3">
          {[
            { num: '1', text: 'انسخ رابط الدعوة أو شاركه مع أصدقائك' },
            { num: '2', text: 'يقوم صديقك بتحميل التطبيق والتسجيل عبر رابطك' },
            { num: '3', text: `تحصل على ${REFERRAL_REWARD} نقطة فور انضمامه` },
          ].map((step) => (
            <div key={step.num} className="glass rounded-2xl p-4 border border-zinc-800/50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sky-400 font-black text-sm">{step.num}</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed pt-1">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
