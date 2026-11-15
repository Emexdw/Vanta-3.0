import React from 'react';
import { Bell, Compass, House, Plus, UserRound } from 'lucide-react';
import type { ActiveTab, User } from '../types';

type Props = {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentUser: User;
  hasUnreadNotifications: boolean;
  onOpenCreate: () => void;
};

export function BottomNav({ activeTab, onTabChange, currentUser, hasUnreadNotifications, onOpenCreate }: Props) {
  const tabs = [
    { id: 'inicio' as const, label: 'Inicio', icon: House },
    { id: 'explorar' as const, label: 'Explorar', icon: Compass },
    { id: 'crear' as const, label: 'Crear', icon: Plus },
    { id: 'actividad' as const, label: 'Actividad', icon: Bell },
    { id: 'perfil' as const, label: 'Perfil', icon: UserRound }
  ];

  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0b10]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-2xl grid-cols-5 px-2 py-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => id === 'crear' ? onOpenCreate() : onTabChange(id)}
              aria-label={label}
              aria-current={selected ? 'page' : undefined}
              title={label}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${selected ? 'text-violet-300 bg-violet-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
            >
              {id === 'perfil' && currentUser.avatar ? (
                <img src={currentUser.avatar} alt="" className={`h-5 w-5 rounded-full object-cover ${selected ? 'ring-2 ring-violet-400' : ''}`} />
              ) : <Icon aria-hidden="true" className="h-5 w-5" />}
              <span>{label}</span>
              {id === 'actividad' && hasUnreadNotifications && <span className="absolute right-[28%] top-1.5 h-2 w-2 rounded-full bg-rose-500" aria-label="Notificaciones sin leer" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
