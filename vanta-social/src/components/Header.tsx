import React from 'react';
import { Volume2, VolumeX, ChevronRight, Film, LayoutGrid, MessageCircle } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import { ActiveTab, FeedMode } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  feedMode: FeedMode;
  onFeedModeChange: (mode: FeedMode) => void;
  unreadCount: number;
  onOpenActivity: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenMessages: () => void;
  messageUnread: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  feedMode,
  onFeedModeChange,
  unreadCount,
  onOpenActivity,
  isMuted,
  onToggleMute,
  onOpenMessages,
  messageUnread
}) => {
  const modeButton = (mode: FeedMode, label: string, Icon: typeof Film) => (
    <button
      onClick={() => {
        soundEngine.playTap();
        onFeedModeChange(mode);
      }}
      aria-pressed={feedMode === mode}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
        feedMode === mode ? 'bg-white text-black shadow-sm font-semibold' : 'text-zinc-400 hover:text-white'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 w-full bg-[#09090b]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3 transition-colors">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" width="32" height="32" /><span className="font-semibold text-lg tracking-tight text-white">Vanta</span>
          {activeTab !== 'inicio' && (
            <span className="text-xs text-zinc-500 font-medium">
              · {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </span>
          )}
        </div>

        {activeTab === 'inicio' && (
          <div className="flex items-center bg-[#18181b] p-1 rounded-full border border-white/[0.08]">
            {modeButton('feed', 'Feed', LayoutGrid)}
            {modeButton('clips', 'Clips', Film)}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMessages}
            aria-label={messageUnread > 0 ? `Mensajes (${messageUnread} sin leer)` : 'Mensajes'}
            className="relative w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {messageUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[9px] font-semibold text-white flex items-center justify-center">
                {messageUnread > 9 ? '9+' : messageUnread}
              </span>
            )}
          </button>

          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-zinc-200" />
            )}
          </button>

          {activeTab === 'inicio' && unreadCount > 0 && (
            <button
              onClick={onOpenActivity}
              className="flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 px-2.5 py-1.5 rounded-full border border-white/10 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-0.5" />
              <span>
                {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
