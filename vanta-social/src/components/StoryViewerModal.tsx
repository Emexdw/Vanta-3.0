import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';
import { Story } from '../types';
import { soundEngine } from '../utils/audioSynth';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
  onViewed: (storyId: string) => void;
}

const TICK_MS = 50;

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  onClose,
  onOpenProfile,
  onViewed
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs a callbacks para que los efectos no se reinicien cuando App cambia sus funciones
  const onCloseRef = useRef(onClose);
  const onViewedRef = useRef(onViewed);
  useEffect(() => {
    onCloseRef.current = onClose;
    onViewedRef.current = onViewed;
  });

  const currentStory = stories[currentIndex];
  const storyDurationMs = currentStory?.mediaType === 'video' ? 15000 : 5000;
  const increment = (TICK_MS / storyDurationMs) * 100;

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onCloseRef.current();
    }
  }, [currentIndex, stories.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [currentIndex]);

  // Audio ambiente por historia
  useEffect(() => {
    soundEngine.startAmbientLoop(currentStory?.soundTitle);
    return () => soundEngine.stopAmbientLoop();
  }, [currentStory?.soundTitle, currentIndex]);

  // Marcar como vista
  useEffect(() => {
    if (currentStory) onViewedRef.current(currentStory.id);
  }, [currentStory?.id]);

  // Reloj: solo suma progreso (sin efectos secundarios dentro del updater)
  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(() => {
      setProgress((prev) => Math.min(100, prev + increment));
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [isPaused, increment]);

  // Avance automático cuando la barra llega al 100%
  useEffect(() => {
    if (progress >= 100) goNext();
  }, [progress, goNext]);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const showToast = (message: string, ms = 2000) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage((cur) => (cur === message ? null : cur)), ms);
  };

  const handleSendReaction = (emoji: string) => {
    soundEngine.playHeartLike();
    const newId = Date.now() + Math.random();
    const randomX = Math.floor(Math.random() * 60) + 20;
    setFloatingEmojis((prev) => [...prev, { id: newId, emoji, x: randomX }]);
    window.setTimeout(() => setFloatingEmojis((prev) => prev.filter((item) => item.id !== newId)), 1500);
    showToast(`Reaccionaste con ${emoji}`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    soundEngine.playPublish();
    showToast(`Mensaje enviado a @${currentStory.user.username}`, 2500);
    setReplyText('');
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center select-none">
      <div className="relative w-full h-full max-w-md max-h-[92vh] sm:rounded-2xl overflow-hidden bg-black flex flex-col justify-between shadow-2xl border border-white/10">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.x}%` }}
            className="absolute bottom-24 text-3xl pointer-events-none animate-bounce z-30 drop-shadow-lg"
          >
            {item.emoji}
          </div>
        ))}

        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg border border-white/10 backdrop-blur-md animate-fade-in font-medium">
            {toastMessage}
          </div>
        )}

        <div className="absolute top-3 left-0 right-0 z-30 px-3 flex items-center gap-1.5">
          {stories.map((st, idx) => {
            const width = idx < currentIndex ? 100 : idx === currentIndex ? progress : 0;
            return (
              <div key={st.id} className="h-0.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${width}%` }} />
              </div>
            );
          })}
        </div>

        <div className="absolute top-7 left-0 right-0 z-30 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpenProfile(currentStory.user.username)}
              className="w-8 h-8 rounded-full border border-white/30 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
            >
              <img src={currentStory.user.avatar} alt={currentStory.user.username} className="w-full h-full object-cover" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onOpenProfile(currentStory.user.username)}
                  className="text-xs font-semibold text-white hover:underline transition-colors"
                >
                  @{currentStory.user.username}
                </button>
                {currentStory.user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300 fill-zinc-800" />}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <span>{currentStory.timestamp}</span>
                {currentStory.soundTitle && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[120px] text-zinc-300">🎵 {currentStory.soundTitle}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar historia"
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="relative flex-1 w-full overflow-hidden flex items-center justify-center cursor-pointer"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <img
            src={currentStory.mediaUrl}
            alt={currentStory.caption || 'Historia'}
            draggable={false}
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-20 opacity-0"
            aria-label="Historia anterior"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-0 top-0 bottom-0 w-2/3 z-20 opacity-0"
            aria-label="Historia siguiente"
          />

          {currentStory.caption && (
            <div className="absolute bottom-24 left-4 right-4 z-20 pointer-events-none">
              <p className="text-white text-xs font-medium bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl inline-block border border-white/10">
                {currentStory.caption}
              </p>
            </div>
          )}
        </div>

        <div className="relative z-30 p-3 bg-zinc-950/95 border-t border-white/[0.08] flex flex-col gap-2.5">
          <div className="flex items-center justify-around px-2">
            {['🔥', '🤍', '😍', '👏', '⚡', '🚀'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="text-lg hover:scale-125 active:scale-95 transition-transform p-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              placeholder={`Responder a @${currentStory.user.username}...`}
              className="flex-1 bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              aria-label="Enviar respuesta"
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-200 active:scale-95 transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
