import { useState, useEffect } from 'react';
import { X, Play } from 'lucide-react';

interface AdSimulatorProps {
  open: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export default function AdSimulator({ open, onComplete, onClose }: AdSimulatorProps) {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (open) {
      setSecondsLeft(5);
      setStarted(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !started) return;
    if (secondsLeft <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, started, secondsLeft, onComplete]);

  if (!open) return null;

  const progress = ((5 - secondsLeft) / 5) * 100;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 bg-zinc-900">
        <span className="text-amber-400 text-xs font-bold tracking-wide">إعلان • Ad</span>
        {secondsLeft <= 0 ? (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
        ) : (
          <span className="text-zinc-500 text-xs">تخطي بعد {secondsLeft}ث</span>
        )}
      </div>

      {/* Ad content */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-700" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/70 blur-2xl motion-reduce:hidden" />
          <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-amber-300/70 blur-2xl motion-reduce:hidden" style={{ animationDelay: '1s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-8">
          <div className="text-7xl mb-6 animate-bounce">🎉</div>
          <h2 className="text-3xl font-black text-white mb-3 drop-shadow-lg">Profit Spectator</h2>
          <p className="text-white/90 text-lg font-bold mb-2">شاهد واربح النقاط!</p>
          <p className="text-white/70 text-sm">اكمل مشاهدة الإعلان للحصول على 10 نقاط</p>
        </div>

        {/* Start button */}
        {!started && (
          <button
            onClick={() => setStarted(true)}
            className="relative z-10 mt-10 bg-white text-amber-600 font-black text-lg px-10 py-4 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
          >
            <Play size={24} fill="currentColor" />
            ابدأ العرض
          </button>
        )}

        {/* Countdown */}
        {started && secondsLeft > 0 && (
          <div className="relative z-10 mt-10">
            <div className="text-6xl font-black text-white drop-shadow-lg tabular-nums">
              {secondsLeft}
            </div>
          </div>
        )}

        {/* Complete */}
        {started && secondsLeft <= 0 && (
          <div className="relative z-10 mt-10 text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-white text-xl font-black">تمت المشاهدة! +10 نقاط</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {started && (
        <div className="h-1.5 bg-zinc-800">
          <div
            className="h-full bg-emerald-400 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
