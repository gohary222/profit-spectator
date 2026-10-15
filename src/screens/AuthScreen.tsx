import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('يرجى ملء جميع الحقول');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const result =
      mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

    if (result.error) {
      const msg = result.error;
      if (msg.includes('Invalid login credentials')) {
        setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setErrorMsg('هذا البريد مسجل بالفعل، سجل الدخول');
      } else if (msg.includes('يرجى تسجيل الدخول')) {
        showToast('success', 'تم إنشاء الحساب! سجل الدخول');
        setMode('login');
        setPassword('');
      } else {
        setErrorMsg(msg);
      }
    } else {
      showToast('success', mode === 'login' ? 'مرحباً بعودتك!' : 'تم إنشاء حسابك!');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 relative overflow-hidden" dir="rtl">
      <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-1/4 right-[-20%] w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8 animate-slideUp">
          <img
            src="/Gold_and_Black_Modern_Online_Shop_Logo.png"
            alt="Profit Spectator"
            width="96"
            height="96"
            fetchPriority="high"
            className="w-24 h-24 rounded-3xl object-cover mx-auto mb-4 shadow-2xl neon-gold"
          />
          <h1 className="text-4xl font-black text-white text-glow-gold">
            <span className="text-amber-400">Profit</span> Spectator
          </h1>
          <p className="text-zinc-500 text-sm mt-1.5">المُشاهد الرابح — شاهد واربح</p>
        </div>

        <div className="glass rounded-3xl p-6 border border-zinc-800/50 shadow-2xl animate-slideUp">
          <div className="flex bg-black/40 rounded-xl p-1 mb-5">
            <button
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'login' ? 'bg-amber-500 text-white shadow-lg' : 'text-zinc-400'
              }`}
            >
              <LogIn size={16} />
              دخول
            </button>
            <button
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'signup' ? 'bg-amber-500 text-white shadow-lg' : 'text-zinc-400'
              }`}
            >
              <UserPlus size={16} />
              حساب جديد
            </button>
          </div>

          <label className="text-zinc-400 text-sm font-bold mb-2 block">البريد الإلكتروني</label>
          <div className="relative mb-4">
            <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
              className="w-full bg-black/40 border border-zinc-800 rounded-xl pr-10 pl-4 py-3 text-white text-left placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          <label className="text-zinc-400 text-sm font-bold mb-2 block">كلمة المرور</label>
          <div className="relative mb-4">
            <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              dir="ltr"
              className="w-full bg-black/40 border border-zinc-800 rounded-xl pr-10 pl-10 py-3 text-white text-left placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm font-bold">{errorMsg}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-l from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-black py-3.5 rounded-xl transition-transform active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg neon-gold"
          >
            {submitting ? (
              <span className="animate-pulse">جاري المعالجة...</span>
            ) : (
              <>
                {mode === 'login' ? <ArrowLeft size={20} /> : <UserPlus size={20} />}
                {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </>
            )}
          </button>

          <p className="text-zinc-600 text-xs text-center mt-4">
            {mode === 'login' ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrorMsg(''); }}
              className="text-amber-400 font-bold hover:underline"
            >
              {mode === 'login' ? 'أنشئ حساباً جديداً' : 'سجل الدخول'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
