import { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, Film, Share2, Star, Flame, Gift } from 'lucide-react';
import { usePoints } from '@/context/PointsContext';
import { useToast } from '@/components/Toast';

interface DailyTask {
  id: string;
  icon: 'film' | 'share' | 'star';
  label: string;
  reward: number;
  done: boolean;
}

const TODAYS_KEY = () => {
  const d = new Date();
  return `tasks_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export default function DailyTasks() {
  const { addPoints } = usePoints();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(TODAYS_KEY());
    const defaultTasks: DailyTask[] = [
      { id: 'watch3', icon: 'film', label: 'شاهد 3 إعلانات', reward: 20, done: false },
      { id: 'share', icon: 'share', label: 'شارك التطبيق مع صديق', reward: 30, done: false },
      { id: 'rate', icon: 'star', label: 'قيّم التطبيق بـ 5 نجوم', reward: 15, done: false },
    ];

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DailyTask[];
        setTasks(parsed);
        return;
      } catch {
        // fall through
      }
    }
    setTasks(defaultTasks);
  }, []);

  const saveTasks = (updated: DailyTask[]) => {
    setTasks(updated);
    localStorage.setItem(TODAYS_KEY(), JSON.stringify(updated));
  };

  const claimTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.done) return;

    setClaiming(taskId);
    const success = await addPoints(task.reward, 'daily_task', `مكافأة: ${task.label}`);
    if (success) {
      const updated = tasks.map((t) => (t.id === taskId ? { ...t, done: true } : t));
      saveTasks(updated);
      showToast('success', `🎯 أحسنت! +${task.reward} نقطة`);
    }
    setClaiming(null);
  };

  const iconMap = {
    film: <Film size={24} className="text-amber-400" />,
    share: <Share2 size={24} className="text-sky-400" />,
    star: <Star size={24} className="text-amber-400" />,
  };

  const doneCount = tasks.filter((t) => t.done).length;
  const totalReward = tasks.reduce((sum, t) => sum + (t.done ? 0 : t.reward), 0);

  return (
    <div className="pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Target className="text-emerald-400" size={28} />
        <h1 className="text-2xl font-black text-white">المهام اليومية</h1>
      </div>

      {/* Progress banner */}
      <div className="relative rounded-3xl overflow-hidden mb-6 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-zinc-900 to-black" />
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Flame className="text-amber-400" size={22} />
            <span className="text-zinc-300 font-bold">تقدمك اليوم</span>
          </div>
          <div className="flex items-baseline justify-center gap-2 mb-3">
            <span className="text-4xl font-black text-emerald-400 tabular-nums">{doneCount}</span>
            <span className="text-zinc-500 font-bold">/ {tasks.length}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className="h-full bg-gradient-to-l from-emerald-400 to-green-500 transition-all duration-500"
              style={{ width: `${(doneCount / tasks.length) * 100}%` }}
            />
          </div>
          <p className="text-zinc-500 text-xs mt-3">
            {totalReward > 0 ? `باقي ${totalReward} نقطة لربحها اليوم` : '🎉 أكملت كل المهام!'}
          </p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-2xl p-4 border transition-all ${
              task.done
                ? 'bg-zinc-900/50 border-zinc-800 opacity-60'
                : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                {task.done ? <CheckCircle2 className="text-emerald-400" size={24} /> : iconMap[task.icon]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${task.done ? 'text-zinc-500 line-through' : 'text-white'}`}>
                  {task.label}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Gift size={14} className="text-amber-400" />
                  <span className="text-amber-400 font-bold text-xs">+{task.reward} نقطة</span>
                </div>
              </div>
              {!task.done && (
                <button
                  onClick={() => claimTask(task.id)}
                  disabled={claiming === task.id}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors active:scale-95 disabled:opacity-50 flex-shrink-0"
                >
                  {claiming === task.id ? '...' : 'استلام'}
                </button>
              )}
              {task.done && (
                <div className="flex items-center gap-1 text-emerald-400 flex-shrink-0">
                  <CheckCircle2 size={18} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-6 bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 flex items-start gap-3">
        <Circle className="text-zinc-600 flex-shrink-0 mt-0.5" size={16} />
        <p className="text-zinc-600 text-xs leading-relaxed">
          تتجدد المهام اليومية كل يوم. أكملها جميعاً لربح أقصى عدد من النقاط. قد يتم التحقق من بعض المهام يدوياً قبل اعتماد المكافأة.
        </p>
      </div>
    </div>
  );
}
