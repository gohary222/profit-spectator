import { memo } from 'react';
import { Home, Wallet, User, Target, Users } from 'lucide-react';

interface BottomNavProps {
  active: string;
  onNavigate: (screen: string) => void;
}

const items = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'tasks', label: 'المهام', icon: Target },
  { id: 'wallet', label: 'المحفظة', icon: Wallet },
  { id: 'invite', label: 'دعوة', icon: Users },
  { id: 'profile', label: 'حسابي', icon: User },
];

function BottomNavBase({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800 px-2 py-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center gap-1 px-3 py-2 transition-transform active:scale-90"
            >
              {isActive && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-amber-400" />
              )}
              <Icon
                size={22}
                className={isActive ? 'text-amber-400' : 'text-zinc-600'}
              />
              <span
                className={`text-[10px] font-bold ${
                  isActive ? 'text-amber-400' : 'text-zinc-600'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(BottomNavBase);
